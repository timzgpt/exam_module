/**
 * Academic Management module — GOVERNANCE tests (module task §13/§14).
 * Run: bun scripts/verify-academic-governance.ts
 *
 * Unlike verify-academic-admin.ts (pure helpers over the seed), this suite
 * exercises the STORE ACTIONS in academic-store.ts: role guards, catalogue
 * rules, teacher-assignment history, registration history, bulk flows and
 * combination guards. The store runs in-memory (persist is skipped outside
 * the browser) and is reset via resetToSeed() between groups.
 */

import {
  useAcademicAdminStore,
  currentActor,
} from "../src/lib/academic-store";
import { useViewer } from "../src/lib/viewer";
import { adoptedCurriculum, effectiveAssignedSubjectIds, itemUsage } from "../src/lib/academic-admin";
import { studentsInClass, teacherById } from "../src/lib/demo-data";

let failures = 0;
// The zustand persist middleware warns on every set() because this script
// runs outside the browser (no localStorage). Silence that expected noise.
console.warn = () => {};
function check(name: string, cond: boolean | undefined | null, detail = ""): void {
  if (!cond) {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? "  — " + detail : ""}`);
  } else {
    console.log(`ok    ${name}`);
  }
}

const FORM3A = "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21";
const YEAR = "2026";
const store = useAcademicAdminStore;
const viewer = useViewer;

function asMaster() {
  viewer.getState().setViewer("academic-master");
}
function asTeacher() {
  // James Mushi teaches Mathematics only (viewer.ts assignment map).
  viewer.getState().setViewer("subject-teacher", "t1");
}

/* ── 1 · Role guards (task §13: only master/admin mutate) ─────────── */
asTeacher();
check("currentActor identifies the scoped teacher", currentActor() === "subject-teacher:t1");
const denied = store.getState().registerItem({
  name: "Governance Probe", code: "GOV1", type: "subject",
  category: "Sciences", sections: ["Secondary"], status: "active",
  description: "",
});
check("subject-teacher cannot register a catalogue item", !denied.ok && denied.error?.includes("Academic Master"));
check("denied mutation appended no audit entry",
  store.getState().audit.every((a) => a.action !== "register-item"));
const deniedAssign = store.getState().assignTeacher({
  teacherId: "t1", classId: FORM3A, itemId: "item-s9", academicYear: YEAR, role: "subject-teacher",
});
check("subject-teacher cannot assign teachers", !deniedAssign.ok);
check("denied action left registrations untouched", store.getState().registrations.length > 0);

/* ── 2 · Catalogue actions ────────────────────────────────────────── */
asMaster();
const dupCode = store.getState().registerItem({
  name: "Further Maths", code: "MTH", type: "subject",
  category: "Mathematics", sections: ["Secondary"], status: "active", description: "",
});
check("action rejects duplicate code", !dupCode.ok && dupCode.error?.includes("MTH"));
const okReg = store.getState().registerItem({
  name: "Governance Probe", code: "GOV1", type: "subject",
  category: "Sciences", sections: ["Secondary"], status: "active",
  description: "Temporary probe item",
});
check("valid registration succeeds", okReg.ok);
const probe = store.getState().items.find((i) => i.code === "GOV1");
check("registered item exists with timestamps", !!probe && !!probe?.createdAt && !!probe?.updatedAt);
check("successful registration appended audit",
  store.getState().audit.some((a) => a.action === "register-item" && a.entityId === probe?.id));

const archived = store.getState().archiveItem(probe!.id);
check("archive toggles status to inactive", archived.ok &&
  store.getState().items.find((i) => i.id === probe!.id)?.status === "inactive");
const addToCurriculum = store.getState().addItemToCurriculum("cur-secondary-form-1", probe!.id, "optional");
check("archived item cannot join a curriculum", !addToCurriculum.ok && addToCurriculum.error?.includes("archived"));
const restored = store.getState().archiveItem(probe!.id);
check("restore toggles status back to active", restored.ok &&
  store.getState().items.find((i) => i.id === probe!.id)?.status === "active");

/* ── 3 · Teacher assignment rules ─────────────────────────────────── */
store.getState().resetToSeed();
const before = store.getState().assignments;
const activeBefore = before.find(
  (a) => a.classId === FORM3A && a.itemId === "item-s1" && a.endsAt === null,
)!;
const dupAssign = store.getState().assignTeacher({
  teacherId: activeBefore.teacherId, classId: FORM3A, itemId: "item-s1",
  academicYear: YEAR, role: "subject-teacher",
});
check("duplicate (teacher, class, item) assignment rejected", !dupAssign.ok && dupAssign.error?.includes("Duplicate"));
const otherTeachers = before.filter((a) => a.teacherId !== activeBefore.teacherId);
const newTeacher = otherTeachers.find((a) => a.classId !== FORM3A)?.teacherId ?? "t2";
const reassigned = store.getState().assignTeacher({
  teacherId: newTeacher, classId: FORM3A, itemId: "item-s1",
  academicYear: YEAR, role: "subject-teacher",
});
check("reassignment succeeds", reassigned.ok);
const ended = store.getState().assignments.find((a) => a.id === activeBefore.id)!;
check("previous assignment row kept with endsAt (history)",
  ended.endsAt !== null && ended.status === "assigned");
const activeNow = store.getState().assignments.filter(
  (a) => a.classId === FORM3A && a.itemId === "item-s1" && a.endsAt === null,
);
check("exactly one active assignment after reassignment", activeNow.length === 1 &&
  activeNow[0].teacherId === newTeacher);
const released = store.getState().unassignTeacher(activeNow[0].id);
check("unassign sets endsAt instead of deleting", released.ok &&
  store.getState().assignments.some((a) => a.id === activeNow[0].id && a.endsAt !== null));

/* ── 4 · Student registration actions ─────────────────────────────── */
store.getState().resetToSeed();
const student = studentsInClass(FORM3A)[0];
const badReg = store.getState().registerStudentSubjects(student.id, FORM3A, ["item-la-language"]);
check("registration with non-curriculum item rejected", !badReg.ok);
const coreReg = store.getState().registerStudentSubjects(student.id, FORM3A, ["item-s1"]);
check("duplicate core registration rejected", !coreReg.ok && coreReg.error?.includes("already registered"));
// The seed pre-registers eligible students for s9 (mirrors demo eligibility),
// so drop any pre-existing row first — the action upserts by deterministic id.
const s9 = "item-s9";
const preExisting = store.getState().registrations.find(
  (r) => r.classId === FORM3A && r.studentId === student.id && r.itemId === s9 && r.status === "active",
);
if (preExisting) store.getState().dropRegistration(preExisting.id);
const optReg = store.getState().registerStudentSubjects(student.id, FORM3A, [s9], { source: "bulk" });
check("optional registration succeeds", optReg.ok, optReg.error ?? "");
const rows = store.getState().registrations.filter(
  (r) => r.classId === FORM3A && r.studentId === student.id && r.itemId === s9,
);
check("one active row created with recorded source", rows.length === 1 &&
  rows[0].status === "active" && rows[0].source === "bulk");
const dropped = store.getState().dropRegistration(rows[0].id);
check("drop keeps the row with status=dropped (history)", dropped.ok &&
  store.getState().registrations.some((r) => r.id === rows[0].id && r.status === "dropped" && r.droppedAt !== null));
const rereg = store.getState().registerStudentSubjects(student.id, FORM3A, [s9]);
check("re-registration after drop upserts an active row", rereg.ok &&
  store.getState().registrations.some(
    (r) => r.classId === FORM3A && r.studentId === student.id && r.itemId === s9 && r.status === "active",
  ));

/* ── 5 · Bulk registration with combination ───────────────────────── */
store.getState().resetToSeed();
const combo = store.getState().combinations.find((c) => c.id === "combo-science")!;
const combinationIdByStudent: Record<string, string> = {};
for (const s of studentsInClass(FORM3A)) combinationIdByStudent[s.id] = combo.id;
const bulk = store.getState().bulkRegisterClass(FORM3A, YEAR, { combinationIdByStudent });
check("bulk registration reports row count", bulk.ok && (bulk.registered ?? 0) > 0,
  `registered=${bulk.registered}`);
const coreRows = store.getState().registrations.filter(
  (r) => r.classId === FORM3A && r.source === "auto-core",
);
check("core rows auto-registered for every student",
  coreRows.length === studentsInClass(FORM3A).length * adoptedCurriculum(store.getState(), FORM3A)!.items.filter((ci) => ci.classification === "core").length);
const comboRows = store.getState().registrations.filter(
  (r) => r.classId === FORM3A && r.combinationId === combo.id && r.status === "active",
);
check("combination rows registered for every student",
  comboRows.length === studentsInClass(FORM3A).length * combo.itemIds.length);

/* ── 6 · History / usage guards ───────────────────────────────────── */
const removeCore = store.getState().removeItemFromCurriculum("cur-secondary-form-1", "item-s1");
check("curriculum item with registration history cannot be removed", !removeCore.ok &&
  removeCore.error?.includes("history"));
const removeAlloc = store.getState().removeFromAdoption(FORM3A, YEAR, "item-s1");
check("allocation item with history cannot be removed", !removeAlloc.ok);
const inUseCombo = store.getState().removeCombination(combo.id);
check("combination in active use cannot be removed", !inUseCombo.ok && inUseCombo.error?.includes("reassign"));

/* ── 7 · Curriculum versioning + allocation publish ───────────────── */
store.getState().resetToSeed();
const v0 = adoptedCurriculum(store.getState(), FORM3A)!.version;
const addProbe = store.getState().addItemToCurriculum("cur-secondary-form-1", "item-la-culture-religion", "optional");
check("adding item is rejected for section mismatch", !addProbe.ok &&
  addProbe.error?.includes("not offered"));
const addOk = store.getState().addItemToCurriculum("cur-secondary-form-1", "item-s9", "core");
check("adding an existing item rejected as duplicate", !addOk.ok && addOk.error?.includes("already"));
const vSame = adoptedCurriculum(store.getState(), FORM3A)!.version;
check("failed mutations do not bump the version", vSame === v0);

const fresh = store.getState().curricula.find((c) => c.id === "cur-secondary-form-1")!;
const adoptAnother = store.getState().adoptCurriculum("cls-1b", YEAR, fresh.id);
check("re-adoption of a curriculum succeeds", adoptAnother.ok);
const published = store.getState().publishAdoption("cls-1b", YEAR);
check("adoption publish stamps publishedAt", published.ok &&
  store.getState().adoptions["cls-1b|2026"]?.status === "published" &&
  store.getState().adoptions["cls-1b|2026"]?.publishedAt !== null);

/* ── 8 · Reset restores the seed exactly ──────────────────────────── */
store.getState().resetToSeed();
const seedState = store.getState();
check("reset restores registrations", seedState.registrations.every((r) => r.status === "active"));
check("reset restores assignment history (single active row per class-item)",
  ["item-s1", "item-s9"].every((itemId) =>
    seedState.assignments.filter((a) => a.classId === FORM3A && a.itemId === itemId && a.endsAt === null).length === 1));
const usage = itemUsage(seedState, "item-s1");
check("usage counts active registrations only", usage.registrations > 50);
const masterScope = store.getState();
check("effective scoping still mirrors demo after reset",
  masterScope.assignments.filter((a) => a.classId === FORM3A && a.role === "subject-teacher" && a.endsAt === null)
    .every((a) => teacherById(a.teacherId) !== undefined));

/* ── summary ──────────────────────────────────────────────────────── */
/* ── 9 · Teacher access follows allocations (task §7/§12) ────────── */
store.getState().resetToSeed();
asMaster();
const t1View = { role: "subject-teacher", teacherId: "t1" } as const;
const mathsBefore = effectiveAssignedSubjectIds(store.getState(), t1View, FORM3A);
check("t1 derives Mathematics access from active assignments",
  mathsBefore.length === 1 && mathsBefore[0] === "s1");
const reassignMaths = store.getState().assignTeacher({
  teacherId: "t2", classId: FORM3A, itemId: "item-s1", academicYear: YEAR, role: "subject-teacher",
});
check("reassignment of Mathematics to t2 succeeds", reassignMaths.ok, reassignMaths.error ?? "");
check("t1 loses marks-entry access after reassignment",
  effectiveAssignedSubjectIds(store.getState(), t1View, FORM3A).length === 0);
const t2View = { role: "subject-teacher", teacherId: "t2" } as const;
check("t2 gains marks-entry access after reassignment",
  effectiveAssignedSubjectIds(store.getState(), t2View, FORM3A).includes("s1"));
// Safety net (§12): a class with NO assignment rows falls back to the demo map.
const stripped = {
  ...store.getState(),
  assignments: store.getState().assignments.filter((a) => a.classId !== FORM3A),
};
const fallback = effectiveAssignedSubjectIds(stripped, t1View, FORM3A);
check("class without assignment rows falls back to legacy derivation",
  fallback.length === 1 && fallback[0] === "s1");

asMaster();
console.log(
  failures === 0
    ? "\nAll academic-governance checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
