"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_IDS } from "./demo-config";
import { cycleById, cycles, studentsInClass } from "./demo-data";
import type { ReportCycle } from "./types";

/**
 * Contextual selection store. The sidebar and header build class- and
 * cycle-specific links from this context, while every page reads its ids
 * from the URL parameters. Replacing demo ids with real backend ids later
 * only requires changing `demo-config.ts`.
 */
export interface AppState {
  cycleId: string;
  classId: string;
  studentId: string;
  /** Cycles created through the "New report cycle" dialog (persisted so
   * their marks entry, dashboard and report card routes resolve app-wide). */
  createdCycles: ReportCycle[];
  /** Full replacement rows for built-in demo cycles edited through the
   * "Edit cycle" dialog, keyed by cycle id (persisted). Demo cycles are
   * module data, so their edits are kept as overrides instead. */
  cycleOverrides: Record<string, ReportCycle>;
  /** Built-in demo cycle ids removed through "Delete cycle" (persisted
   * tombstones — the demo data itself stays untouched). */
  deletedCycleIds: string[];
  setCycle: (id: string) => void;
  setClass: (id: string) => void;
  setStudent: (id: string) => void;
  addCycle: (cycle: ReportCycle) => void;
  /** Upsert from the Edit dialog: created cycles are replaced in place,
   * built-in demo cycles are stored as overrides. */
  updateCycle: (cycle: ReportCycle) => void;
  /** Delete a cycle: created rows are dropped; built-in demo cycles are
   * tombstoned so every listing hides them. */
  removeCycle: (id: string) => void;
}

export const useAppContext = create<AppState>()(
  persist(
    (set) => ({
      cycleId: DEMO_IDS.reportCycleId,
      classId: DEMO_IDS.classId,
      studentId: DEMO_IDS.studentId,
      createdCycles: [],
      cycleOverrides: {},
      deletedCycleIds: [],
      setCycle: (id) => set({ cycleId: id }),
      // A class switch always re-points the student at that class's first
      // student, so sidebar / palette links like "Report card preview" open
      // the SELECTED class's card (primary template for Standard classes,
      // secondary for Forms) — never the previous class's student.
      setClass: (id) => {
        const first = studentsInClass(id)[0];
        set(first ? { classId: id, studentId: first.id } : { classId: id });
      },
      setStudent: (id) => set({ studentId: id }),
      // Newest first; dedupe by id so repeated saves never duplicate rows.
      addCycle: (cycle) =>
        set((s) => ({
          createdCycles: [cycle, ...s.createdCycles.filter((c) => c.id !== cycle.id)],
        })),
      // Edit dialog save. A created cycle is upserted in place (same shape
      // as addCycle); a built-in demo cycle is immutable module data, so the
      // edited row is kept as a full replacement in cycleOverrides.
      updateCycle: (cycle) =>
        set((s) =>
          cycleById(cycle.id)
            ? { cycleOverrides: { ...s.cycleOverrides, [cycle.id]: cycle } }
            : {
                createdCycles: [
                  cycle,
                  ...s.createdCycles.filter((c) => c.id !== cycle.id),
                ],
              },
        ),
      removeCycle: (id) =>
        set((s) => {
          // Built-in demo cycle: tombstone it (and drop any override) so the
          // merged listings hide it while the demo data stays intact.
          if (cycleById(id)) {
            const overrides = { ...s.cycleOverrides };
            delete overrides[id];
            return {
              cycleOverrides: overrides,
              deletedCycleIds: s.deletedCycleIds.includes(id)
                ? s.deletedCycleIds
                : [...s.deletedCycleIds, id],
            };
          }
          // Created cycle: simply drop the row.
          return { createdCycles: s.createdCycles.filter((c) => c.id !== id) };
        }),
    }),
    {
      name: "josephian-context",
      // Rehydrate after mount (see AppShell) so server-rendered markup always
      // matches the first client render: avoids hydration mismatches.
      skipHydration: true,
      // Heal context persisted by older builds, where the class picker could
      // drift away from the student (class = Standard 5A but student still a
      // Form 3A pupil): the class always wins and carries its own student.
      merge: (persisted, current) => {
        const merged = { ...current, ...(typeof persisted === "object" && persisted ? persisted : {}) } as AppState;
        // Cycles created by older builds predate the components model — drop
        // malformed rows rather than crash a page on a missing field.
        if (!Array.isArray(merged.createdCycles)) merged.createdCycles = [];
        merged.createdCycles = merged.createdCycles.filter(
          (c) => c && typeof c.id === "string" && typeof c.name === "string",
        );
        // Heal cycle edit/delete bookkeeping persisted by older builds.
        if (
          !merged.cycleOverrides ||
          typeof merged.cycleOverrides !== "object" ||
          Array.isArray(merged.cycleOverrides)
        )
          merged.cycleOverrides = {};
        if (!Array.isArray(merged.deletedCycleIds)) merged.deletedCycleIds = [];
        const roster = studentsInClass(merged.classId);
        if (roster.length && !roster.some((s) => s.id === merged.studentId)) {
          merged.studentId = roster[0].id;
        }
        return merged;
      },
    },
  ),
);

/**
 * Every cycle the app knows about: built-in demo cycles (edits applied,
 * deletions removed) followed by cycles created through the dialog. List
 * views (cycles page, header picker) render from this selector, so Edit and
 * Delete stay consistent app-wide.
 */
export function selectCycles(
  s: Pick<AppState, "createdCycles" | "cycleOverrides" | "deletedCycleIds">,
): ReportCycle[] {
  const deleted = new Set(s.deletedCycleIds);
  return [
    ...cycles.filter((c) => !deleted.has(c.id)).map((c) => s.cycleOverrides[c.id] ?? c),
    ...s.createdCycles.filter((c) => !deleted.has(c.id)),
  ];
}

/** Resolve one cycle id against the merged list (undefined once deleted). */
export function resolveCycle(
  id: string,
  s: Pick<AppState, "createdCycles" | "cycleOverrides" | "deletedCycleIds">,
): ReportCycle | undefined {
  const created = s.createdCycles.find((c) => c.id === id);
  if (created) return created;
  if (s.deletedCycleIds.includes(id)) return undefined;
  return s.cycleOverrides[id] ?? cycleById(id);
}

export function useNavContext() {
  const { cycleId, classId, studentId } = useAppContext();
  return { cycleId, classId, studentId };
}
