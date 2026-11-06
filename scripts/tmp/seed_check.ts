import { buildSeedAcademicState, effectiveClassSubjectsFor, registeredStudentsFor, classCompleteness, levelsForSection } from "../../src/lib/academic-admin";
import { classSubjectsFor, eligibleStudentsFor, studentsInClass } from "../../src/lib/demo-data";

const s = buildSeedAcademicState();
console.log("items:", s.items.length, "| subjects:", s.items.filter(i=>i.type==="subject").length, "| areas:", s.items.filter(i=>i.type==="learning-area").length);
console.log("codes unique:", new Set(s.items.map(i=>i.code)).size === s.items.length);
console.log("curricula:", s.curricula.map(c=>`${c.id}(${c.items.length})`).join(", "));
console.log("adoptions:", Object.keys(s.adoptions).length, "| assignments:", s.assignments.length, "| registrations:", s.registrations.length);

// Zero-behavior-change proof: effective == demo for every class
let mismatch = 0;
for (const cls of ["cls-p5","cls-1a","cls-1b","cls-2a","01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21","cls-3b","cls-4a"]) {
  const eff = effectiveClassSubjectsFor(s, cls);
  const demo = classSubjectsFor(cls);
  if (eff.length !== demo.length) { mismatch++; console.log("LEN MISMATCH", cls, eff.length, demo.length); continue; }
  for (let i=0;i<eff.length;i++) {
    const a=eff[i], b=demo[i];
    if (a.subjectId!==b.subjectId || a.type!==b.type || a.caMarks!==b.caMarks || a.examMarks!==b.examMarks || a.teacherId!==b.teacherId) {
      mismatch++; console.log("ROW MISMATCH", cls, i, a.subjectId, b.subjectId, a.type, b.type, a.teacherId, b.teacherId);
    }
  }
}
console.log("effective==demo for marks classes:", mismatch===0);

// Registration mirror check for optional s9
const demoS9 = (cls: string) => eligibleStudentsFor(cls, "s9").map(x=>x.id).sort().join(",");
const regS9 = (cls: string) => registeredStudentsFor(s, cls, "item-s9")!.map(x=>x.id).sort().join(",");
let regOk = true;
for (const cls of ["cls-p5","cls-1a","cls-1b","cls-2a","01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21","cls-3b","cls-4a"]) {
  if (demoS9(cls) !== regS9(cls)) { regOk = false; console.log("REG MISMATCH", cls); }
}
console.log("s9 registrations mirror demo eligibility:", regOk);

// Core subjects = all students registered
const core = registeredStudentsFor(s, "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21", "item-s1")!;
console.log("core s1 registered == all students:", core.length === studentsInClass("01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21").length);

console.log("completeness Form 3A:", JSON.stringify(classCompleteness(s, "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21")));
console.log("completeness KG2:", JSON.stringify(classCompleteness(s, "cls-kg2")));
console.log("levels EY:", levelsForSection("Early Years").join(","), "| Primary:", levelsForSection("Primary").join(","), "| Secondary:", levelsForSection("Secondary").join(","));
