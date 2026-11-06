"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { teacherById } from "./demo-data";
import { classByIdAny, defaultConfigFor, defaultTemplateKindFor } from "./report-templates";
import type {
  CompetencyCode,
  NurseryAssessment,
  NurseryTemplateConfig,
  ReportTemplateKind,
} from "./types";

type NurseryKind = Exclude<ReportTemplateKind, "primary" | "secondary">;

/**
 * Persisted administrator configuration for class report templates
 * (task §4) plus teacher edits to Early Years assessments (task §5).
 *
 * Two independent slices in one file because they share one concern — the
 * template system — while every other store edit in the app lives in
 * lib/store.ts (context) and stays untouched.
 *
 * Assignments/configs are keyed by CLASS (never by term), so templates are
 * reusable across academic terms without duplicating the design.
 */

interface TemplateState {
  /** classId -> assigned template kind (admin's per-class assignment). */
  assignments: Record<string, ReportTemplateKind>;
  /**
   * configKey -> full configuration override saved from the admin editor.
   * The key is the class id for period-invariant templates, or
   * `classId::period` for KG3 (see report-templates.templateConfigKey).
   */
  configs: Record<string, NurseryTemplateConfig>;
  /** Assign a template kind: re-seeds the class config from the kind's defaults. */
  assign: (classId: string, kind: ReportTemplateKind) => void;
  /**
   * Persist a full configuration edited on the admin page, under `configKey`.
   * `assignmentClassId` (the plain class id) syncs the class-list badge for
   * templates whose kind the admin can choose (Baby Class A/B); omit it for
   * KG3 so a per-period edit never rewrites the class assignment.
   */
  saveConfig: (
    configKey: string,
    config: NurseryTemplateConfig,
    assignmentClassId?: string,
  ) => void;
  /** Drop the admin override under `configKey`; also clears the assignment if given. */
  resetConfig: (configKey: string, assignmentClassId?: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      assignments: {},
      configs: {},
      assign: (classId, kind) =>
        set((s) => {
          // Personalise the first signature slot with the class teacher's name.
          const teacherName =
            teacherById(classByIdAny(classId)?.classTeacherId ?? "")?.name ?? "";
          const config = defaultConfigFor(
            classId,
            kind as NurseryKind,
            teacherName,
          );
          return {
            assignments: { ...s.assignments, [classId]: kind },
            configs: { ...s.configs, [classId]: config },
          };
        }),
      saveConfig: (configKey, config, assignmentClassId) =>
        set((s) => ({
          configs: { ...s.configs, [configKey]: config },
          assignments: assignmentClassId
            ? { ...s.assignments, [assignmentClassId]: config.kind as ReportTemplateKind }
            : s.assignments,
        })),
      resetConfig: (configKey, assignmentClassId) =>
        set((s) => {
          const configs = { ...s.configs };
          delete configs[configKey];
          const assignments = { ...s.assignments };
          if (assignmentClassId) delete assignments[assignmentClassId];
          return { configs, assignments };
        }),
    }),
    {
      name: "josephian-report-templates",
      skipHydration: true,
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(typeof persisted === "object" && persisted ? persisted : {}),
        } as TemplateState;
        if (!merged.assignments || typeof merged.assignments !== "object")
          merged.assignments = {};
        if (!merged.configs || typeof merged.configs !== "object") merged.configs = {};
        return merged;
      },
    },
  ),
);

/* ----------------------------------------------------------------
 * Early Years assessment edits (per cycle | class | student)
 * ---------------------------------------------------------------- */

export interface NurseryAssessmentPatch {
  assessedOn?: string;
  benchmarkRemarks?: Record<string, string>;
  benchmarkGrades?: Record<string, CompetencyCode | null>;
  areaComments?: Record<string, string>;
  classTeacherComment?: string;
}

interface AssessmentState {
  /** "cycleId|classId|studentId" -> saved patch over the seeded assessment. */
  overrides: Record<string, NurseryAssessmentPatch>;
  saveAssessment: (key: string, patch: NurseryAssessmentPatch) => void;
}

export const useNurseryAssessmentStore = create<AssessmentState>()(
  persist(
    (set) => ({
      overrides: {},
      saveAssessment: (key, patch) =>
        set((s) => ({
          overrides: { ...s.overrides, [key]: { ...s.overrides[key], ...patch } },
        })),
    }),
    {
      name: "josephian-nursery-assessments",
      skipHydration: true,
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(typeof persisted === "object" && persisted ? persisted : {}),
        } as AssessmentState;
        if (!merged.overrides || typeof merged.overrides !== "object")
          merged.overrides = {};
        return merged;
      },
    },
  ),
);

/** Storage key for one learner's assessment override. */
export const assessmentKey = (
  cycleId: string,
  classId: string,
  studentId: string,
): string => `${cycleId}|${classId}|${studentId}`;

export type { ReportTemplateKind, NurseryAssessment };
export { defaultTemplateKindFor };
