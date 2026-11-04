import type { GradeBoundary, GradingScheme } from "./types";

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

export function gradeFor(
  mark: number,
  scheme: GradingScheme,
): GradeBoundary | undefined {
  return scheme.boundaries.find((b) => mark >= b.min && mark <= b.max);
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
