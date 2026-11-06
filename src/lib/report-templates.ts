/**
 * Report template registry — the resolution layer between a learner's class
 * and the report-card engine that prints their card (task §3).
 *
 *   Baby Class → Baby Class Template A or B (administrator's choice)
 *   KG1 / KG2 / KG3 → their own competency templates
 *   Standard / Grade classes → the existing PRIMARY marks card
 *   Form 1–4 → the existing SECONDARY NECTA card
 *
 * Kind resolution is level-driven; the persisted template store (see
 * hooks/use-class-template.ts) carries the administrator's per-class
 * assignment and full configuration overrides on top.
 */

import {
  defaultKindForNurseryClass,
  defaultTemplateConfig,
  nurseryClasses,
} from "./nursery";
import { classes as marksClasses } from "./demo-data";
import type {
  ClassRoom,
  NurseryPeriod,
  NurseryTemplateConfig,
  ReportCycle,
  ReportTemplateKind,
  SchoolSection,
} from "./types";

export type { NurseryKind } from "./nursery";

const CLASS_BY_ID = new Map<string, ClassRoom>(
  [...marksClasses, ...nurseryClasses].map((c) => [c.id, c]),
);

/** Look a class up across BOTH the marks-based and nursery class lists. */
export function classByIdAny(classId: string): ClassRoom | undefined {
  return CLASS_BY_ID.get(classId);
}

/** The three sections of the school, for grouping and admin screens. */
export function schoolSectionOf(classId: string): SchoolSection {
  const level = CLASS_BY_ID.get(classId)?.level ?? "";
  if (level === "Baby Class" || level.startsWith("KG")) return "Early Years";
  if (level.startsWith("Form")) return "Secondary";
  return "Primary";
}

/** True when the class prints one of the observation/competency templates. */
export function isNurseryTemplateKind(
  kind: ReportTemplateKind,
): kind is Exclude<ReportTemplateKind, "primary" | "secondary"> {
  return (
    kind === "baby-class-a" ||
    kind === "baby-class-b" ||
    kind === "kg1" ||
    kind === "kg2" ||
    kind === "kg3"
  );
}

/**
 * The template kind a class resolves to BEFORE administrator overrides:
 * level-driven defaults (task §3 table).
 */
export function defaultTemplateKindFor(classId: string): ReportTemplateKind {
  const level = CLASS_BY_ID.get(classId)?.level ?? "";
  if (level === "Baby Class") return defaultKindForNurseryClass(classId);
  if (level === "KG1") return "kg1";
  if (level === "KG2") return "kg2";
  if (level === "KG3") return "kg3";
  if (level.startsWith("Form")) return "secondary";
  return "primary";
}

/** Human label for any template kind (badges, selectors, headings). */
export function templateKindLabel(kind: ReportTemplateKind): string {
  switch (kind) {
    case "baby-class-a":
      return "Baby Class · Template A";
    case "baby-class-b":
      return "Baby Class · Template B";
    case "kg1":
      return "KG1 template";
    case "kg2":
      return "KG2 template";
    case "kg3":
      return "KG3 template";
    case "primary":
      return "Primary report template";
    case "secondary":
      return "Secondary report template";
  }
}

/**
 * Build a full default configuration for a class, personalised with the
 * class teacher's name on the first signature slot. `period` selects the KG3
 * benchmark set (ignored by every period-invariant template).
 */
export function defaultConfigFor(
  classId: string,
  kind: Exclude<ReportTemplateKind, "primary" | "secondary">,
  classTeacherName: string,
  period: NurseryPeriod = "terminal",
): NurseryTemplateConfig {
  return defaultTemplateConfig(kind, classId, classTeacherName, period);
}

/** KG3 is the only template whose benchmark set changes with the period. */
export function isPeriodVaryingKind(kind: ReportTemplateKind): boolean {
  return kind === "kg3";
}

/** The assessment period a cycle produces: mid-term/monthly vs terminal/annual. */
export function nurseryPeriodForCycle(
  cycle: Pick<ReportCycle, "kind">,
): NurseryPeriod {
  return cycle.kind === "mid-term" || cycle.kind === "monthly"
    ? "midterm"
    : "terminal";
}

/**
 * The persisted-config key for a class's template. Period-varying templates
 * (KG3) store one config per period so Midterm and End-of-Term benchmark sets
 * are maintained independently; every other template keys by class alone.
 */
export function templateConfigKey(
  classId: string,
  kind: ReportTemplateKind,
  period: NurseryPeriod,
): string {
  return isPeriodVaryingKind(kind) ? `${classId}::${period}` : classId;
}
