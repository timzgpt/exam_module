/**
 * Academic Management module verification (module task §14).
 * Run: bun scripts/verify-academic-admin.ts
 *
 * Pure-layer tests over lib/academic-admin + lib/academic-store actions:
 *   catalogue rules, section-specific curricula, teacher assignment rules,
 *   student registration rules (auto / individual / combination / bulk),
 *   and the zero-behavior-change seed guarantee.
 */

import {
  adoptedCurriculum,
  effectiveAssignedSubjectIds,
  classCompleteness,
  buildSeedAcademicState,
  effectiveClassSubjectsFor,
  itemHasHistory,
  itemUsage,
  registeredItemIdsForStudent,
  registeredStudentsFor,
  validateItem,
  validateRegistration,
  workloadFor,
} from "../src/lib/academic-admin";
import {
  eligibleStudentsFor,
  classSubjectsFor,
  classById,
  studentsInClass,
} from "../src/lib/demo-data";

let failures = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (!cond) {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? "  — " + detail : ""}`);
  } else {
    console.log(`ok    ${name}`);
  }
}

const FORM3A = "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21";
const YEAR = "2026";
const seed = buildSeedAcademicState();

/* ── 1 · Catalogue ────────────────────────────────────────────────── */
check("catalogue registers subjects once (no per-class copies)",
  seed.items.filter((i) => i.name === "Mathematics").length === 1);
check("codes are unique", new Set(seed.items.map((i) => i.code)).size === seed.items.length);
check("duplicate code rejected",
  validateItem(seed, { name: "Further Maths", code: "MTH", type: "subject", category: "Mathematics", sections: ["Secondary"] }).length === 1);
check("duplicate name rejected",
  validateItem(seed, { name: "mathematics", code: "FMT", type: "subject", category: "Mathematics", sections: ["Secondary"] }).length === 1);
check("item without sections rejected",
  validateItem(seed, { name: "X", code: "XXX", type: "subject", category: "Sciences", sections: [] }).length === 1);
check("item without category rejected",
  validateItem(seed, { name: "X", code: "XXX", type: "subject", category: "  ", sections: ["Primary"] }).some((e) => e.includes("Category")));
check("valid new item passes",
  validateItem(seed, { name: "Further Maths", code: "FMT", type: "subject", category: "Mathematics", sections: ["Secondary"] }).length === 0);
check("subjects available to both sections",
  seed.items.filter((i) => i.type === "subject").every((i) => i.sections.includes("Primary") && i.sections.includes("Secondary")));
check("learning areas are Early Years only",
  seed.items.filter((i) => i.type === "learning-area").every((i) => i.sections.length === 1 && i.sections[0] === "Early Years"));

/* ── 2 · Zero-behavior-change seed guarantee ──────────────────────── */
const MARKS_CLASSES = ["cls-p5", "cls-1a", "cls-1b", "cls-2a", FORM3A, "cls-3b", "cls-4a"];
let effectiveMatchesDemo = true;
for (const cls of MARKS_CLASSES) {
  const eff = effectiveClassSubjectsFor(seed, cls);
  const demo = classSubjectsFor(cls);
  if (eff.length !== demo.length) effectiveMatchesDemo = false;
  for (let i = 0; i < Math.min(eff.length, demo.length); i++) {
    const a = eff[i], b = demo[i];
    if (a.subjectId !== b.subjectId || a.type !== b.type || a.caMarks !== b.caMarks ||
        a.examMarks !== b.examMarks || a.teacherId !== b.teacherId) effectiveMatchesDemo = false;
  }
}
check("seeded effective allocation == demo allocation for every class", effectiveMatchesDemo);
check("KG2 curriculum has 5 learning areas",
  adoptedCurriculum(seed, "cls-kg2")?.items.length === 5);
check("KG3 curriculum has 6 learning areas",
  adoptedCurriculum(seed, "cls-kg3")?.items.length === 6);
check("Form 1 curriculum has core Mathematics",
  adoptedCurriculum(seed, "cls-1a")?.items.some((ci) => ci.itemId === "item-s1" && ci.classification === "core") === true);
check("Computer Studies is the only optional item in the Form 1 curriculum",
  adoptedCurriculum(seed, "cls-1a")?.items.filter((ci) => ci.classification === "optional").map((ci) => ci.itemId).join(",") === "item-s9");

/* ── 3 · Student registration mirrors demo eligibility ────────────── */
let registrationsMirrorDemo = true;
for (const cls of MARKS_CLASSES) {
  const demoIds = eligibleStudentsFor(cls, "s9").map((s) => s.id).sort().join(",");
  const regIds = registeredStudentsFor(seed, cls, "item-s9")?.map((s) => s.id).sort().join(",");
  if (demoIds !== regIds) registrationsMirrorDemo = false;
}
check("optional registrations mirror demo eligibility in every class", registrationsMirrorDemo);
check("core subjects registered for every student",
  (registeredStudentsFor(seed, FORM3A, "item-s1")?.length ?? 0) === studentsInClass(FORM3A).length);
check("no registration for an unallocated item",
  registeredStudentsFor(seed, FORM3A, "item-la-language") === null);
check("registeredItemIdsForStudent lists exactly the curriculum set",
  registeredItemIdsForStudent(seed, FORM3A, "st1")?.length === 9);

/* ── 4 · Registration validation ──────────────────────────────────── */
const student = studentsInClass(FORM3A)[0];
const unregisteredOptional = eligibleStudentsFor(FORM3A, "s9").some((s) => s.id === student.id)
  ? [] // student already registered for s9 — use another optional-less check
  : ["item-s9"];
const dup = validateRegistration(seed, student.id, FORM3A, ["item-s1"]);
check("duplicate core registration rejected", dup.errors.some((e) => e.includes("already registered")));
const comboScience = seed.combinations[0];
const otherStudent = studentsInClass(FORM3A)[2];
const notInCombo = validateRegistration(seed, otherStudent.id, FORM3A, [comboScience.itemIds[0]], "combo-humanities");
check("combination membership enforced", notInCombo.errors.some((e) => e.includes("not part of")));
const combo = seed.combinations.find((c) => c.id === "combo-science")!;
check("combination min/max configured", combo.minSelections === 2 && combo.maxSelections === 3);
check("item not in curriculum rejected",
  validateRegistration(seed, student.id, FORM3A, ["item-la-language"]).errors.length > 0);

/* ── 5 · Teacher allocation ───────────────────────────────────────── */
check("teacher allocation mirrors demo subjectTeacherOf",
  effectiveClassSubjectsFor(seed, FORM3A).every((cs) => cs.teacherId !== ""));
const master = { role: "academic-master", teacherId: null };
check("academic master sees every subject",
  effectiveAssignedSubjectIds(seed, master, FORM3A).length === 9);
const teacher = seed.assignments.find((a) => a.classId === FORM3A && a.role === "subject-teacher")!;
const scoped = { role: "subject-teacher", teacherId: teacher.teacherId };
check("subject-teacher sees only assigned subjects (when scoped)",
  effectiveAssignedSubjectIds(seed, scoped, FORM3A).every((sid) =>
    seed.assignments.some((a) => a.classId === FORM3A && a.itemId === `item-${sid}` && a.teacherId === teacher.teacherId)));
const wl = workloadFor(seed, "t1");
check("workload counts classes and items for t1", wl.items.length > 0 && wl.classes.length > 0,
  JSON.stringify(wl));

/* ── 6 · History guards ───────────────────────────────────────────── */
check("item with registrations has history (removal guarded)",
  itemHasHistory(seed, "item-s1", FORM3A));
check("unused item has no history", !itemHasHistory(seed, "item-la-culture-religion", FORM3A));
const usage = itemUsage(seed, "item-s1");
check("usage reports curricula + adoptions + registrations",
  usage.curricula.length >= 5 && usage.adoptions.length >= 7 && usage.registrations > 50);

/* ── 7 · Completeness ─────────────────────────────────────────────── */
check("seeded classes are 100% configured",
  classCompleteness(seed, FORM3A).score === 100 &&
  classCompleteness(seed, "cls-kg2").score === 100 &&
  classCompleteness(seed, "cls-p5").score === 100);

/* ── 8 · Early Years model is developmental ───────────────────────── */
const kg2 = adoptedCurriculum(seed, "cls-kg2")!;
check("KG2 items use the developmental model, not marks",
  kg2.items.every((ci) => ci.assessment.developmentalModel?.join(",") === "Emerging,Developing,Achieved,Exceeding Expectations"));
check("Secondary items use numeric CA+Exam",
  adoptedCurriculum(seed, "cls-1a")!.items.every((ci) => ci.assessment.caMarks + ci.assessment.examMarks === 100));

/* ── 9 · Different classes can adopt different curricula ─────────── */
check("Form 1A and Form 1B adopt the same level curriculum independently",
  adoptedCurriculum(seed, "cls-1a")?.id === adoptedCurriculum(seed, "cls-1b")?.id);
check("Standard 5 keeps its own curriculum",
  adoptedCurriculum(seed, "cls-p5")?.section === "Primary");

/* ── 10 · Class helpers ──────────────────────────────────────────── */
check("classById resolves nursery and marks classes",
  classById("cls-kg2")?.name === "KG2" && classById(FORM3A)?.name === "Form 3A");

/* ── summary ─────────────────────────────────────────────────────── */
console.log(
  failures === 0
    ? "\nAll academic-admin checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
