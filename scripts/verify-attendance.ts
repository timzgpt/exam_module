/**
 * A3.8 attendance engine verification (run with: bun scripts/verify-attendance.ts)
 * Checks: possible-school-day count, rating boundaries, per-student invariants
 * and the zero-division edge.
 */
import {
  ATTENDANCE_RATING_TEXT,
  attendanceRatingKey,
  computeAttendanceSummary,
  possibleSchoolDays,
} from "../src/lib/attendance";
import { attendanceRecordFor, students } from "../src/lib/demo-data";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown): void {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  (actual: ${actual}, expected: ${expected})`);
}

// 1. Possible school days for the demo cycle: 12 Jan – 11 Mar 2026,
//    weekdays minus the 12 Jan Zanzibar Revolution Day holiday.
check(
  "possibleSchoolDays(2026-01-12 .. 2026-03-11) === 42",
  possibleSchoolDays("2026-01-12", "2026-03-11"),
  42,
);
check("possibleSchoolDays zero-length range", possibleSchoolDays("2026-03-11", "2026-03-11") >= 0, true);
check("possibleSchoolDays inverted range", possibleSchoolDays("2026-03-11", "2026-01-12"), 0);

// 2. Rating boundaries (C13 defaults).
check("rate 95 -> excellent", attendanceRatingKey(95), "excellent");
check("rate 94.9 -> good", attendanceRatingKey(94.9), "good");
check("rate 90 -> good", attendanceRatingKey(90), "good");
check("rate 89.9 -> needs-improvement", attendanceRatingKey(89.9), "needs-improvement");
check("rate 80 -> needs-improvement", attendanceRatingKey(80), "needs-improvement");
check("rate 79.9 -> concern", attendanceRatingKey(79.9), "concern");
check("rate null -> none", attendanceRatingKey(null), "none");

// 3. Per-student invariants across the whole demo roll.
const summaries = students.map((s) => ({ s, a: attendanceRecordFor(s.id) }));
let invariantFailures = 0;
for (const { s, a } of summaries) {
  const errs: string[] = [];
  if (a.daysAttended !== a.present + a.late) errs.push("daysAttended != present+late");
  if (a.daysRecorded !== a.present + a.late + a.absent + a.excused)
    errs.push("daysRecorded != p+l+a+e");
  if (a.notRecorded !== a.possibleSchoolDays - a.daysRecorded)
    errs.push("notRecorded != possible - recorded");
  if (a.notRecorded < 0) errs.push("negative notRecorded");
  const expectedRate =
    a.daysRecorded === 0
      ? null
      : Math.round((a.daysAttended / a.daysRecorded) * 1000) / 10;
  if (a.rate !== expectedRate) errs.push(`rate ${a.rate} != ${expectedRate}`);
  if (a.rating !== attendanceRatingKey(a.rate)) errs.push("rating mismatch");
  if (a.from !== "2026-01-12" || a.to !== "2026-03-11") errs.push("period mismatch");
  if (errs.length > 0) {
    invariantFailures += 1;
    console.log(`FAIL  ${s.id}: ${errs.join("; ")}`);
  }
}
check("all student summaries satisfy A3.8 invariants", invariantFailures, 0);

// 4. Flagship student (st1): pinned register — every spec row visible.
const flagship = summaries.find((x) => x.s.id === "st1")!;
console.log(
  `st1 summary: attended ${flagship.a.daysAttended}/${flagship.a.daysRecorded} of ${flagship.a.possibleSchoolDays} possible · rate ${flagship.a.rate}% · late ${flagship.a.late} · absent ${flagship.a.absent} · excused ${flagship.a.excused} · notRecorded ${flagship.a.notRecorded} · ${ATTENDANCE_RATING_TEXT[flagship.a.rating as keyof typeof ATTENDANCE_RATING_TEXT]}`,
);
check("st1 daysAttended === 38", flagship.a.daysAttended, 38);
check("st1 daysRecorded === 41", flagship.a.daysRecorded, 41);
check("st1 notRecorded === 1", flagship.a.notRecorded, 1);
check("st1 rate === 92.7", flagship.a.rate, 92.7);
check("st1 rating === good", flagship.a.rating, "good");

// 5. Zero-division edge (B2.15): nothing recorded -> null rate, no rating.
const empty = computeAttendanceSummary({
  from: "2026-01-12",
  to: "2026-03-11",
  possibleSchoolDays: 42,
  marks: Array(42).fill(null),
});
check("empty register rate null", empty.rate, null);
check("empty register rating none", empty.rating, "none");
check("empty register notRecorded 42", empty.notRecorded, 42);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
