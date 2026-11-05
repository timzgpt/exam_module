import type {
  AttendanceRatingKey,
  AttendanceStatus,
  AttendanceSummary,
} from "./types";

/**
 * Report-card attendance engine (knowledge base A3.8 / C13).
 *
 * Pure functions only — a real integration reads the ERP's daily register
 * (`attendances` with context `daily_roll_call`), keeps only days whose roll
 * call is counted, and loads holidays / no-register events once per range.
 * The demo pins the same arithmetic over a fake register (see demo-data).
 */

/**
 * Rating thresholds for the attendance rate. Suggested A3.8 defaults;
 * configurable per school (C13 leaves final confirmation open).
 */
export const ATTENDANCE_RATING_THRESHOLDS = {
  excellent: 95,
  good: 90,
  needsImprovement: 80,
} as const;

/** Rating text (EN). Text always accompanies the colour of the rate bar. */
export const ATTENDANCE_RATING_TEXT: Record<
  Exclude<AttendanceRatingKey, "none">,
  string
> = {
  excellent: "Excellent attendance",
  good: "Good attendance",
  "needs-improvement": "Attendance needs improvement",
  concern: "Attendance is a concern",
};

/** Map a rate to its rating band; null (nothing recorded) has no rating. */
export function attendanceRatingKey(
  rate: number | null,
  thresholds: {
    excellent: number;
    good: number;
    needsImprovement: number;
  } = ATTENDANCE_RATING_THRESHOLDS,
): AttendanceRatingKey {
  if (rate === null) return "none";
  if (rate >= thresholds.excellent) return "excellent";
  if (rate >= thresholds.good) return "good";
  if (rate >= thresholds.needsImprovement) return "needs-improvement";
  return "concern";
}

/**
 * Tanzania public holidays inside the demo cycle's attendance period. A real
 * integration reads the ERP `public_holidays` table (A3.8); the demo pins the
 * one real statutory holiday between 12 January and 11 March 2026:
 * Zanzibar Revolution Day (12 January).
 */
export const DEMO_PUBLIC_HOLIDAYS: ReadonlySet<string> = new Set([
  "2026-01-12",
]);

/** Demo no-register days (events with event_type = 'no_register'); none in range. */
export const DEMO_NO_REGISTER_DAYS: ReadonlySet<string> = new Set();

/**
 * Possible school days in [from, to]: weekdays minus public holidays minus
 * no-register days. Loaded once for the whole range — never one query per
 * day (A3.8 step 3).
 */
export function possibleSchoolDays(
  from: string,
  to: string,
  holidays: ReadonlySet<string> = DEMO_PUBLIC_HOLIDAYS,
  noRegisterDays: ReadonlySet<string> = DEMO_NO_REGISTER_DAYS,
): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  let count = 0;
  for (let t = start; t <= end; t += 86_400_000) {
    const iso = new Date(t).toISOString().slice(0, 10);
    const day = new Date(t).getUTCDay();
    if (day === 0 || day === 6) continue; // weekend
    if (holidays.has(iso) || noRegisterDays.has(iso)) continue;
    count += 1;
  }
  return count;
}

export interface AttendanceMarksInput {
  from: string;
  to: string;
  possibleSchoolDays: number;
  /**
   * Counted roll-call marks for the student in the period. A `null` entry is
   * a possible school day with no counted mark ("not recorded") — it is
   * reported separately and never counted as absent (A3.8 step 4).
   */
  marks: (AttendanceStatus | null)[];
  thresholds?: {
    excellent: number;
    good: number;
    needsImprovement: number;
  };
}

/**
 * Aggregate counted roll-call marks into the card summary:
 * - Days attended = present + late (late counts as attended).
 * - Days recorded = present + late + absent + excused (excused stays in the
 *   denominator, matching the ERP attendance dashboard — C13).
 * - Rate = days attended / days recorded x 100, 1 dp; null when nothing is
 *   recorded ("No attendance recorded for this period" — B2.15).
 */
export function computeAttendanceSummary({
  from,
  to,
  possibleSchoolDays: possible,
  marks,
  thresholds,
}: AttendanceMarksInput): AttendanceSummary {
  let present = 0;
  let late = 0;
  let absent = 0;
  let excused = 0;
  for (const mark of marks) {
    if (mark === "present") present += 1;
    else if (mark === "late") late += 1;
    else if (mark === "absent") absent += 1;
    else if (mark === "excused") excused += 1;
  }
  const daysRecorded = present + late + absent + excused;
  const daysAttended = present + late;
  const notRecorded = Math.max(0, possible - daysRecorded);
  const rate =
    daysRecorded === 0
      ? null
      : Math.round((daysAttended / daysRecorded) * 1000) / 10;
  return {
    from,
    to,
    possibleSchoolDays: possible,
    present,
    late,
    absent,
    excused,
    notRecorded,
    daysAttended,
    daysRecorded,
    rate,
    rating: attendanceRatingKey(rate, thresholds),
  };
}
