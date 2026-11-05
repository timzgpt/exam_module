import type { DivisionResult, GradeBoundary, GradingScheme } from "./types";

/** Default Josephian grading scheme (used when no scheme id is given). */
export const DEFAULT_SCHEME_ID = "gs-2026";

/** Deterministic tone per grade letter for pills, chips and charts. */
export const GRADE_TONES: Record<string, string> = {
  A: "bg-success/12 text-success-strong border-success/30",
  B: "bg-grade-b/12 text-grade-b-strong border-grade-b/30",
  C: "bg-warning/14 text-warning-strong border-warning/35",
  D: "bg-grade-d/12 text-grade-d-strong border-grade-d/30",
  E: "bg-grade-e/12 text-grade-e-strong border-grade-e/30",
  F: "bg-destructive/12 text-destructive border-destructive/30",
};

/**
 * Lower-bound inclusive grade lookup: bands are contiguous floors, so any
 * decimal mark (e.g. 80.99 with an A floor of 81) resolves to exactly one
 * grade. Boundaries are matched by the highest floor the mark reaches.
 */
export function gradeFor(
  mark: number,
  scheme: GradingScheme,
): GradeBoundary | undefined {
  const floors = [...scheme.boundaries].sort((a, b) => b.min - a.min);
  return floors.find((b) => mark >= b.min);
}

/**
 * Subject total — the "100% rule":
 * - both components present: round(CA x w1 + Exam x w2, 2)
 * - one component missing:   the present component counts 100%
 * - both missing (ABS/NA/NR/PENDING): null — subject omitted entirely
 * Weights are given as marks out of 100 (e.g. caMarks 30, examMarks 70).
 */
export function subjectTotal(
  ca: number | null,
  exam: number | null,
  caMarks: number,
  examMarks: number,
): number | null {
  if (ca === null && exam === null) return null;
  if (ca === null) return exam;
  if (exam === null) return ca;
  const w1 = caMarks / (caMarks + examMarks);
  const w2 = examMarks / (caMarks + examMarks);
  return Math.round((ca * w1 + exam * w2) * 100) / 100;
}

/**
 * Overall class score: avg(CA) x w1 + avg(Exam) x w2. If one component has no
 * entries at all the other counts 100%; null when neither has any entries.
 */
export function overallClassScore(
  caValues: (number | null)[],
  examValues: (number | null)[],
  caMarks: number,
  examMarks: number,
): number | null {
  const ca = caValues.filter((v): v is number => v !== null);
  const exam = examValues.filter((v): v is number => v !== null);
  if (ca.length === 0 && exam.length === 0) return null;
  const w1 = caMarks / (caMarks + examMarks);
  const w2 = examMarks / (caMarks + examMarks);
  const caAvg = ca.length ? ca.reduce((a, b) => a + b, 0) / ca.length : null;
  const examAvg = exam.length ? exam.reduce((a, b) => a + b, 0) / exam.length : null;
  if (caAvg === null) return examAvg;
  if (examAvg === null) return caAvg;
  return Math.round((caAvg * w1 + examAvg * w2) * 100) / 100;
}

/**
 * Component average (formula 2): sum of the entered values divided by the
 * number of entered values. Blanks are doubly excluded — they count towards
 * neither the sum nor the denominator (the legacy system divided by the full
 * class size, which depressed averages whenever a mark was missing).
 * Returns null when nothing has been entered at all.
 */
export function componentAverage(values: (number | null)[]): number | null {
  const entered = values.filter((v): v is number => v !== null);
  if (entered.length === 0) return null;
  return entered.reduce((a, b) => a + b, 0) / entered.length;
}

/**
 * Most-improved subject (Primary report cards, formula 8): the largest
 * per-subject CA delta C2 − C1 between this term's and last term's
 * continuous-assessment mark. A subject with a single recorded term counts
 * as 0 (not an improvement). Ties go to the first subject in report-card
 * order — the caller passes deltas already sorted in that order.
 */
export function mostImprovedSubject(
  deltas: { subjectId: string; delta: number }[],
): { subjectId: string; delta: number } | null {
  if (deltas.length === 0) return null;
  return deltas.reduce((best, d) => (d.delta > best.delta ? d : best));
}

/** CSEE division bands: best-7 points sum mapped to a division. */
const DIVISION_BANDS: {
  division: DivisionResult["division"];
  label: string;
  min: number;
  max: number;
}[] = [
  { division: "I", label: "Distinction", min: 7, max: 17 },
  { division: "II", label: "Credit", min: 18, max: 21 },
  { division: "III", label: "Merit", min: 22, max: 25 },
  { division: "IV", label: "Pass", min: 26, max: 33 },
  { division: "0", label: "Fail", min: 34, max: 35 },
];

export const DIVISION_I_CEILING = 17;

/**
 * Secondary division (NECTA style): sum of the best 7 graded subject points.
 * Students with fewer than 7 graded subjects cannot be placed in a division
 * (returns null — no division is printed).
 */
export function divisionFor(points: (number | null)[]): DivisionResult | null {
  const graded = points.filter((p): p is number => p !== null);
  if (graded.length < 7) return null;
  const best7 = [...graded].sort((a, b) => a - b).slice(0, 7);
  const pointsSum = best7.reduce((a, b) => a + b, 0);
  const band = DIVISION_BANDS.find((b) => pointsSum >= b.min && pointsSum <= b.max);
  if (!band) return null;
  return {
    division: band.division,
    label: band.label,
    pointsSum,
    gapToDivisionI: pointsSum - DIVISION_I_CEILING,
  };
}

/**
 * Count of subjects passed: grade letter is NOT E or F.
 * (Replaces the legacy hard-coded "All Passed".)
 */
export function subjectsPassed(grades: (string | null)[]): number {
  return grades.filter((g) => g !== null && g !== "E" && g !== "F").length;
}

/** Display a weighted subject total: integers plain, decimals trimmed to 2dp. */
export function fmtTotalMark(t: number): string {
  return parseFloat(t.toFixed(2)).toString();
}

export function gradeToneClass(grade: string): string {
  return GRADE_TONES[grade] ?? "bg-muted text-muted-foreground border-border";
}

export function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function formatAvg(n: number): string {
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(1);
}

export function passRateOf(
  values: number[],
  passMark: number,
): number {
  if (values.length === 0) return 0;
  const passed = values.filter((v) => v >= passMark).length;
  return Math.round((passed / values.length) * 100);
}

/** Arrow + delta label vs previous value. */
export function deltaLabel(
  current: number,
  previous: number,
  digits = 1,
): { text: string; up: boolean } {
  const diff = current - previous;
  const up = diff >= 0;
  return {
    text: `${up ? "+" : "−"}${Math.abs(diff).toFixed(digits)}`,
    up,
  };
}
