import type { CycleComponent, CycleExamKind, ReportCycle } from "./types";

/**
 * Exam combinations for report cycles (creation dialog + mark sheet).
 *
 * A cycle combines exams into one report card:
 * - plain cycles carry their own exam at 100 % and keep the classic CA/Exam
 *   mark sheet;
 * - combined cycles carry TWO exams, each entered out of 100 with a weight,
 *   e.g. "Monthly 25 % + Mid-Term 75 %" or "Mid-Term 25 % + Terminal 75 %".
 *
 * Combination rule (school convention): the Annual Exam is the final,
 * standalone exam — it can NEVER be part of a combination (no
 * Mid-Term + Annual, no Monthly + Annual). Monthly, Mid-Term and Terminal
 * may pair freely.
 */

/** The four exams with their display names. */
export const EXAM_KINDS: { kind: CycleExamKind; label: string }[] = [
  { kind: "monthly", label: "Monthly Test" },
  { kind: "mid-term", label: "Mid-Term" },
  { kind: "terminal", label: "Terminal Exam" },
  { kind: "annual", label: "Annual Exam" },
];

export const examLabel = (kind: CycleExamKind): string =>
  EXAM_KINDS.find((e) => e.kind === kind)?.label ?? kind;

/**
 * Default component rows when the dialog's Exam select changes — the school's
 * standard setups: a mid-term report combines Monthly 25 % + Mid-Term 75 %,
 * a terminal report combines Mid-Term 25 % + Terminal 75 %; monthly and
 * annual reports run their single exam.
 */
export function defaultComponents(kind: CycleExamKind): CycleComponent[] {
  switch (kind) {
    case "mid-term":
      return [
        { label: "Monthly", exam: "monthly", weight: 25 },
        { label: "Mid-Term", exam: "mid-term", weight: 75 },
      ];
    case "terminal":
      return [
        { label: "Mid-Term", exam: "mid-term", weight: 25 },
        { label: "Terminal", exam: "terminal", weight: 75 },
      ];
    case "monthly":
      return [{ label: "Monthly", exam: "monthly", weight: 100 }];
    case "annual":
      return [{ label: "Annual", exam: "annual", weight: 100 }];
  }
}

/**
 * Validation for the components editor. Returns an error message or null.
 * Rules: at least one row, labels filled, no exam twice, weights sum to
 * 100, and the Annual Exam never appears in a combination.
 */
export function componentsError(components: CycleComponent[]): string | null {
  if (components.length === 0) return "Add at least one exam component.";
  if (components.some((c) => !c.label.trim()))
    return "Every component needs a label.";
  const exams = components.map((c) => c.exam);
  if (new Set(exams).size !== exams.length)
    return "Each exam can appear only once — combine different exams.";
  if (components.some((c) => !Number.isFinite(c.weight) || c.weight <= 0))
    return "Weights must be positive percentages.";
  if (components.reduce((a, c) => a + c.weight, 0) !== 100)
    return "Weights must add up to 100 %.";
  if (exams.includes("annual") && components.length > 1)
    return "Annual Exam runs on its own — combining it (e.g. Mid-Term + Annual) is not allowed.";
  return null;
}

/**
 * The two components of a COMBINED cycle, or null for plain cycles (no
 * components field, or a single 100 % entry). Plain cycles keep the classic
 * CA/Exam mark sheet; combined cycles drive one mark-sheet column per exam.
 */
export function combinedComponents(cycle: ReportCycle): CycleComponent[] | null {
  const comps = cycle.components;
  return comps && comps.length >= 2 ? comps : null;
}

/** True when the Annual Exam is part of this cycle (standalone by rule). */
export const isAnnualCycle = (cycle: ReportCycle): boolean =>
  cycle.kind === "annual" || (cycle.components?.some((c) => c.exam === "annual") ?? false);

/**
 * Cycle name from the dialog: "{Exam} - {year}" for plain cycles
 * ("Terminal Exam - 2026"), "{First} + {Second} - {year}" for combined
 * cycles ("Monthly + Mid-Term - 2026").
 */
export function cycleName(
  kind: CycleExamKind,
  components: CycleComponent[],
  year: string,
): string {
  const exams = components.length > 1 ? components.map((c) => c.label.trim()) : [examLabel(kind)];
  return `${exams.join(" + ")} - ${year.trim() || "…"}`;
}
