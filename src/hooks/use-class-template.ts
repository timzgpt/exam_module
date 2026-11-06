"use client";

import { useEffect, useMemo } from "react";
import { teacherById } from "@/lib/demo-data";
import {
  classByIdAny,
  defaultConfigFor,
  defaultTemplateKindFor,
  isNurseryTemplateKind,
  nurseryPeriodForCycle,
  templateConfigKey,
} from "@/lib/report-templates";
import { seedNurseryAssessment } from "@/lib/nursery";
import {
  assessmentKey,
  useNurseryAssessmentStore,
  useTemplateStore,
} from "@/lib/template-store";
import type {
  NurseryAssessment,
  NurseryPeriod,
  NurseryTemplateConfig,
  ReportTemplateKind,
  ReportCycle,
} from "@/lib/types";

/**
 * Resolution hooks over the persisted template store. Every report-card
 * surface (staff preview, portal, entry editor, admin page) resolves the
 * class's template through these hooks — never through hardcoded levels.
 */

/** Resolve a class's assigned template kind (admin assignment > level default). */
export function useClassTemplateKind(classId: string): ReportTemplateKind {
  // Persisted stores rehydrate after mount (same pattern as lib/store.ts,
  // see AppShell) so the first client render matches the server markup.
  useEffect(() => {
    void useTemplateStore.persist.rehydrate();
  }, []);
  const assignments = useTemplateStore((s) => s.assignments);
  return assignments[classId] ?? defaultTemplateKindFor(classId);
}

/**
 * Resolve a class's full template configuration (override > level default).
 * `period` selects the KG3 benchmark set; it is ignored by every
 * period-invariant template, so callers without a cycle can omit it.
 */
export function useClassTemplateConfig(
  classId: string,
  period: NurseryPeriod = "terminal",
): NurseryTemplateConfig {
  useEffect(() => {
    void useTemplateStore.persist.rehydrate();
  }, []);
  const configs = useTemplateStore((s) => s.configs);
  const assignments = useTemplateStore((s) => s.assignments);
  // Memoised so callers can safely use the result in effect dependencies —
  // the default branch builds a fresh object only when the store changes.
  return useMemo(() => {
    const kind = assignments[classId] ?? defaultTemplateKindFor(classId);
    const teacherName =
      teacherById(classByIdAny(classId)?.classTeacherId ?? "")?.name ?? "";
    if (!isNurseryTemplateKind(kind)) {
      // Defensive: nursery config requested for a marks-based class — fall
      // back to the Baby Class default rather than crash the surface.
      return defaultConfigFor(classId, "baby-class-a", teacherName, period);
    }
    const key = templateConfigKey(classId, kind, period);
    const override = configs[key];
    if (override) return override;
    return defaultConfigFor(classId, kind, teacherName, period);
  }, [configs, assignments, classId, period]);
}

/**
 * One learner's Early Years assessment: the deterministic seeded record
 * with any teacher-saved edits layered on top (per cycle | class | student).
 * Memoised on its inputs so callers can keep it in effect dependencies.
 */
export function useNurseryAssessment(
  classId: string,
  studentId: string,
  cycle: Pick<ReportCycle, "id" | "name" | "reportDate" | "kind">,
): NurseryAssessment {
  useEffect(() => {
    void useNurseryAssessmentStore.persist.rehydrate();
  }, []);
  const overrides = useNurseryAssessmentStore((s) => s.overrides);
  // Seed against the RESOLVED config for this cycle's period (admin assignment
  // + edits), so Template A/B switches, KG3 period sets, and benchmark edits
  // all produce demo data keyed to the benchmark IDs the renderer shows.
  const config = useClassTemplateConfig(classId, nurseryPeriodForCycle(cycle));
  return useMemo(() => {
    const seed = seedNurseryAssessment(classId, studentId, cycle, config);
    const patch = overrides[assessmentKey(cycle.id, classId, studentId)];
    return patch ? { ...seed, ...patch } : seed;
  }, [classId, studentId, cycle, overrides, config]);
}
