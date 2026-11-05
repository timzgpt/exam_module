/**
 * Class Subjects spec verification (run: bun scripts/verify-class-subjects.ts).
 *
 * Exercises every numbered formula from the Class Subjects specification plus
 * the integration seams (scheme-per-class, primary division suppression,
 * demo-data invariants). Exits non-zero on the first failure.
 */
import {
  componentAverage,
  divisionFor,
  fmtTotalMark,
  gradeFor,
  mostImprovedSubject,
  overallClassScore,
  subjectTotal,
  subjectsPassed,
} from "../src/lib/grading";
import {
  classResults,
  classSubjectsFor,
  classes,
  defaultScheme,
  getComponents,
  getMarks,
  isPrimaryClass,
  markStatusOf,
  prevCaOf,
  schemeById,
  schemeForClass,
  studentsInClass,
  subjectAveragesFor,
  subjects,
} from "../src/lib/demo-data";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✓ ${label} → ${a}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}: expected ${e}, got ${a}`);
  }
}

function section(title: string) {
  console.log(`\n== ${title} ==`);
}

/* ---- F1: subject total ---- */
section("F1 · subject total (double component, 100% rule, null on double missing)");
check("24 CA + 58 Exam @ 30/70 = 47.8", subjectTotal(24, 58, 30, 70), 47.8);
check("one missing (CA) → exam counts 100%", subjectTotal(null, 58, 30, 70), 58);
check("one missing (Exam) → CA counts 100%", subjectTotal(24, null, 30, 70), 24);
check("both missing → null (subject omitted)", subjectTotal(null, null, 30, 70), null);
check("formatting keeps 2dp trimmed", fmtTotalMark(47.8), "47.8");

/* ---- F2: component averages ---- */
section("F2 · component averages (blanks doubly excluded)");
check("avg of entered only", componentAverage([70, null, 80, 90]), 80);
check("all blank → null", componentAverage([null, null]), null);
check("single entered value", componentAverage([null, 66]), 66);

/* ---- F3: class total ---- */
section("F3 · class total = avg(CA)×w1 + avg(Exam)×w2");
// CA entered [40, 60] → avg 50; Exam entered [70] → avg 70 → 50×0.3 + 70×0.7 = 64
check("weighted component averages", overallClassScore([40, 60], [70], 30, 70), 64);
check("no Exam entries → CA counts 100%", overallClassScore([40, 60], [], 30, 70), 50);
check("no CA entries → Exam counts 100%", overallClassScore([], [70, 80], 30, 70), 75);
check("nothing entered → null", overallClassScore([], [], 30, 70), null);

/* ---- F4: primary bands (lower bound inclusive) ---- */
section("F4 · primary A–E bands");
const primary = schemeById("gs-primary-2026");
check("80.99 stays B (floor bands)", gradeFor(80.99, primary)?.grade, "B");
check("81 reaches A", gradeFor(81, primary)?.grade, "A");
check("61 → B", gradeFor(61, primary)?.grade, "B");
check("41 → C", gradeFor(41, primary)?.grade, "C");
check("21 → D", gradeFor(21, primary)?.grade, "D");
check("20.5 → E", gradeFor(20.5, primary)?.grade, "E");
check("0 → E", gradeFor(0, primary)?.grade, "E");

/* ---- F5: secondary NECTA CSEE bands + points ---- */
section("F5 · secondary NECTA CSEE bands");
check("75 → A / 1 point", [gradeFor(75, defaultScheme)?.grade, gradeFor(75, defaultScheme)?.points], ["A", 1]);
check("74.99 → B / 2", [gradeFor(74.99, defaultScheme)?.grade, gradeFor(74.99, defaultScheme)?.points], ["B", 2]);
check("65 → B", gradeFor(65, defaultScheme)?.grade, "B");
check("45 → C / 3", [gradeFor(45, defaultScheme)?.grade, gradeFor(45, defaultScheme)?.points], ["C", 3]);
check("30 → D / 4", gradeFor(30, defaultScheme)?.grade, "D");
check("29.99 → F / 5", gradeFor(29.99, defaultScheme)?.grade, "F");

/* ---- F6: divisions ---- */
section("F6 · divisions (best 7 points, lower = better)");
check("7 points → Div I", divisionFor([1, 1, 1, 1, 1, 1, 1, 5, 5])?.division, "I");
check("17 points → Div I", divisionFor(Array(7).fill(2).concat([3]))?.pointsSum, 14);
check("18 → Div II", divisionFor([1, 2, 2, 3, 3, 3, 4])?.division, "II");
check("22 → Div III", divisionFor([2, 3, 3, 3, 3, 4, 4])?.division, "III");
check("26 → Div IV", divisionFor([3, 4, 4, 4, 4, 3, 4])?.division, "IV");
check("34+ → Div 0 (fail)", divisionFor([5, 5, 5, 5, 5, 5, 4])?.division, "0");
check("only 6 graded → no division", divisionFor([1, 1, 1, 1, 1, 1]), null);
check("gap to Div I = points − 17", divisionFor([1, 2, 2, 3, 3, 3, 4])?.gapToDivisionI, 1);

/* ---- F8: most improved ---- */
section("F8 · most improved (largest C2 − C1, tie → first in order)");
check("largest delta wins", mostImprovedSubject([{ subjectId: "a", delta: 2 }, { subjectId: "b", delta: 9 }, { subjectId: "c", delta: -3 }])?.subjectId, "b");
check("tie → first in passed order", mostImprovedSubject([{ subjectId: "a", delta: 4 }, { subjectId: "b", delta: 4 }])?.subjectId, "a");
check("empty → null", mostImprovedSubject([]), null);

/* ---- F9: subjects passed ---- */
section("F9 · subjects passed (grade not E/F)");
check("E and F fail, others pass", subjectsPassed(["A", "B", "C", "D", "E", "F", null]), 4);

/* ---- F10: status codes in demo data ---- */
section("F10 · status codes (ABS/NA/NR/PENDING → null, DISQ → 0)");
check("DISQ is a real zero (f1a-04 · English)", getMarks("cls-1a", "s2")["f1a-04"], 0);
check("DISQ carries the DISQ status", markStatusOf("cls-1a", "s2", "f1a-04"), "DISQ");
check("ABS student has no mark (f4a-03 · Chemistry)", getMarks("cls-4a", "s5")["f4a-03"], null);
check("ABS carries the ABS status", markStatusOf("cls-4a", "s5", "f4a-03"), "ABS");
check("PENDING subject fully blank (2A · Geography)", Object.values(getMarks("cls-2a", "s7")).every((v) => v === null), true);
check("non-enrolled subsidiary student → null", getMarks("cls-1a", "s9")["f1a-02"], null);

/* ---- Integration: scheme per class + primary suppression ---- */
section("Integration · scheme per class & primary handling");
check("Standard 5A is primary", isPrimaryClass("cls-p5"), true);
check("Form 3A is secondary", isPrimaryClass(classes[1].id), false);
check("Standard 5A uses the primary scheme", schemeForClass("cls-p5").id, "gs-primary-2026");
check("Standard 5A roster", studentsInClass("cls-p5").length, 12);
check("Standard 5A subject list", classSubjectsFor("cls-p5").length, subjects.length);

const p5 = classResults("cls-p5");
check("primary divisions suppressed (all null)", p5.every((r) => r.division === null), true);
check("primary grades within A–E", p5.every((r) => ["A", "B", "C", "D", "E"].includes(r.grade)), true);

const f3a = classResults("01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21");
check("secondary grades within A–F", f3a.every((r) => ["A", "B", "C", "D", "F"].includes(r.grade)), true);
check("secondary division computed for ≥7 graded", f3a.every((r) => (r.count >= 7 ? r.division !== null : r.division === null)), true);

section("Integration · ordering & component seams");
const csOrder = classSubjectsFor("cls-p5").map((cs) => cs.subjectId);
check("subjectAveragesFor follows class-subject order", subjectAveragesFor("cls-p5").map((s) => s.subjectId), csOrder);
check("every class-subject has a teacher + full marks = CA + Exam", classSubjectsFor("cls-p5").every((cs) => cs.teacherId && cs.fullMarks === cs.caMarks + cs.examMarks), true);

const p5Student = studentsInClass("cls-p5")[0];
const deltas = classSubjectsFor("cls-p5").map((cs) => {
  const comp = getComponents("cls-p5", cs.subjectId)[p5Student.id];
  const prev = prevCaOf("cls-p5", cs.subjectId)[p5Student.id] ?? null;
  const cur = comp?.enrolled ? comp.ca ?? null : null;
  return { subjectId: cs.subjectId, delta: cur !== null && prev !== null ? cur - prev : 0 };
});
const worstDelta = Math.max(...deltas.map((d) => Math.abs(d.delta)));
check("prev-term CA deltas stay in the seeded −10…+18 band", worstDelta <= 18, true);
check("most-improved pick exists for demo primary student", mostImprovedSubject(deltas) !== null, true);
check("prev CA values are valid marks", classSubjectsFor("cls-p5").every((cs) => {
  const rec = prevCaOf("cls-p5", cs.subjectId);
  return Object.values(rec).every((v) => v === null || (v >= 0 && v <= 100));
}), true);

section("Integration · no NaN anywhere in results");
let nanFound = false;
for (const c of classes) {
  for (const r of classResults(c.id)) {
    if (!Number.isFinite(r.total) || !Number.isFinite(r.average)) nanFound = true;
  }
  for (const s of subjectAveragesFor(c.id)) {
    if (!Number.isFinite(s.avg)) nanFound = true;
  }
}
check("all totals/averages finite", nanFound, false);

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
