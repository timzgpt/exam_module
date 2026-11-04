import type { GradeBoundary, GradingScheme } from "./types";

/** Default Josephian grading scheme (used when no scheme id is given). */
export const DEFAULT_SCHEME_ID = "gs-2026";

/** Deterministic tone per grade letter for pills, chips and charts. */
export const GRADE_TONES: Record<string, string> = {
  A: "bg-[#16834a]/12 text-[#116b3c] border-[#16834a]/30",
  B: "bg-[#3d7d2f]/12 text-[#35682a] border-[#3d7d2f]/30",
  C: "bg-[#c47a16]/14 text-[#9a5f11] border-[#c47a16]/35",
  D: "bg-[#b05c1c]/12 text-[#96491a] border-[#b05c1c]/30",
  E: "bg-[#b3352e]/12 text-[#a02a25] border-[#b3352e]/30",
  F: "bg-[#dc2626]/12 text-[#dc2626] border-[#dc2626]/30",
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

export function rankOf(value: number, all: number[]): number {
  const sorted = [...all].sort((a, b) => b - a);
  return sorted.indexOf(value) + 1;
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
