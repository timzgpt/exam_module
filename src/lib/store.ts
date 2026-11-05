"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_IDS } from "./demo-config";
import { studentsInClass } from "./demo-data";
import type { ReportCycle } from "./types";

/**
 * Contextual selection store. The sidebar and header build class- and
 * cycle-specific links from this context, while every page reads its ids
 * from the URL parameters. Replacing demo ids with real backend ids later
 * only requires changing `demo-config.ts`.
 */
interface AppState {
  cycleId: string;
  classId: string;
  studentId: string;
  /** Cycles created through the "New report cycle" dialog (persisted so
   * their marks entry, dashboard and report card routes resolve app-wide). */
  createdCycles: ReportCycle[];
  setCycle: (id: string) => void;
  setClass: (id: string) => void;
  setStudent: (id: string) => void;
  addCycle: (cycle: ReportCycle) => void;
}

export const useAppContext = create<AppState>()(
  persist(
    (set) => ({
      cycleId: DEMO_IDS.reportCycleId,
      classId: DEMO_IDS.classId,
      studentId: DEMO_IDS.studentId,
      createdCycles: [],
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
        const roster = studentsInClass(merged.classId);
        if (roster.length && !roster.some((s) => s.id === merged.studentId)) {
          merged.studentId = roster[0].id;
        }
        return merged;
      },
    },
  ),
);

export function useNavContext() {
  const { cycleId, classId, studentId } = useAppContext();
  return { cycleId, classId, studentId };
}
