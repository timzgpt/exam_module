/**
 * Validates the four-sentence comment generator for every demo student:
 *  - classTeacher and parentalInvolvement are exactly 4 sentences
 *  - deterministic: two calls return identical paragraphs
 *  - marks quoted as x.xx and averages as x.xx
 *  - missing set → both null + draft; draft set → draft status
 *  - no placeholder braces leak into the text
 */
import {
  commentFor,
  studentsInClass,
  classes,
  classResults,
  classSubjectsFor,
  getComponents,
  subjectComment,
  studentById,
  schemeForClass,
} from "../src/lib/demo-data";

let failures = 0;
let checked = 0;

function fail(msg: string) {
  failures += 1;
  console.error(`  ✗ ${msg}`);
}

const sentenceCount = (t: string) =>
  t.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0).length;

for (const cls of classes) {
  for (const s of studentsInClass(cls.id)) {
    checked += 1;
    const c = commentFor(cls.id, s.id);

    if (c.classTeacher === null || c.parentalInvolvement === null) continue; // missing set

    for (const [label, text] of [
      ["classTeacher", c.classTeacher],
      ["parentalInvolvement", c.parentalInvolvement],
    ] as const) {
      const n = sentenceCount(text);
      if (n !== 4) fail(`${cls.name}/${s.name} ${label}: ${n} sentences (want 4) — "${text}"`);
      if (/\{\w+\}/.test(text)) fail(`${cls.name}/${s.name} ${label}: placeholder leak — "${text}"`);
    }

    // Determinism
    const again = commentFor(cls.id, s.id);
    if (again.classTeacher !== c.classTeacher || again.parentalInvolvement !== c.parentalInvolvement) {
      fail(`${cls.name}/${s.name}: not deterministic`);
    }
  }
}

// Spot checks: quoted numbers match the result engine for one student.
let probe: { classId: string; id: string; name: string } | undefined;
for (const cls of classes) {
  for (const s of studentsInClass(cls.id)) {
    const c = commentFor(cls.id, s.id);
    if (c.classTeacher && !c.classTeacher.includes("not yet complete")) {
      probe = { classId: cls.id, id: s.id, name: s.name };
      break;
    }
  }
  if (probe) break;
}
if (probe) {
  const c = commentFor(probe.classId, probe.id)!;
  const r = classResults(probe.classId).find((x) => x.student.id === probe.id)!;
  if (!c.classTeacher!.includes(r.average.toFixed(2))) {
    fail(`spot check: average ${r.average.toFixed(2)} not quoted for ${probe.name}`);
  }
  if (!c.classTeacher!.includes(String(r.rank))) {
    fail(`spot check: rank ${r.rank} not quoted for ${probe.name}`);
  }
}

// Missing students must have both null + draft.
const missingProbe = studentsInClass("cls-1a").find((s) => s.id === "f1a-02");
if (missingProbe) {
  const c = commentFor("cls-1a", missingProbe.id);
  if (c.classTeacher !== null || c.parentalInvolvement !== null || c.status !== "draft") {
    fail(`missing student f1a-02 should be null/draft, got ${JSON.stringify(c)}`);
  }
}

// ---- Subject comments: 3 sentences for every enrolled, assessed subject ----
let subjectChecked = 0;
for (const cls of classes) {
  const scheme = schemeForClass(cls.id);
  for (const s of studentsInClass(cls.id)) {
    const result = classResults(cls.id).find((r) => r.student.id === s.id);
    if (!result) continue;
    for (const cs of classSubjectsFor(cls.id)) {
      const mark = result.marks[cs.subjectId];
      if (mark === null || mark === undefined) continue;
      const comp = getComponents(cls.id, cs.subjectId)[s.id];
      subjectChecked += 1;
      const text = subjectComment(s.id, cs.subjectId, mark, scheme, {
        ca: comp?.ca ?? null,
        exam: comp?.exam ?? null,
      });
      const n = sentenceCount(text);
      if (n !== 3) fail(`${cls.name}/${s.name}/${cs.subjectId}: ${n} sentences (want 3) — "${text}"`);
      if (/\{\w+\}/.test(text)) fail(`${cls.name}/${s.name}/${cs.subjectId}: placeholder leak — "${text}"`);
      const first = text.split(/[.!?](?:\s|$)/)[0];
      const firstName = s.name.split(" ")[0];
      if (!first.includes(firstName)) {
        fail(`${cls.name}/${s.name}/${cs.subjectId}: opening omits student name — "${first}"`);
      }
      if (!first.includes(mark.toFixed(2))) {
        fail(`${cls.name}/${s.name}/${cs.subjectId}: opening omits mark ${mark.toFixed(2)} — "${first}"`);
      }
      // Determinism
      const again = subjectComment(s.id, cs.subjectId, mark, scheme, {
        ca: comp?.ca ?? null,
        exam: comp?.exam ?? null,
      });
      if (again !== text) fail(`${cls.name}/${s.name}/${cs.subjectId}: not deterministic`);
      // With both components recorded the middle sentence compares CA and exam.
      if (comp?.ca != null && comp?.exam != null && !(/CA/.test(text) && /exam/i.test(text) && /%/.test(text))) {
        fail(`${cls.name}/${s.name}/${cs.subjectId}: component sentence missing CA/exam % — "${text}"`);
      }
      // Percentages must stay within 0–100.
      const pcts = [...text.matchAll(/(\d+)%/g)].map((m) => Number(m[1]));
      if (pcts.some((p) => p < 0 || p > 100)) {
        fail(`${cls.name}/${s.name}/${cs.subjectId}: percentage out of range — "${text}"`);
      }
    }
  }
}

// F-grade (secondary) must map onto the E-tone pool, not the C tone.
const fProbe = studentById("st1")!;
const fText = subjectComment(fProbe.id, "sub-math", 10, schemeForClass(fProbe.classId));
if (!/difficult|low result|below|rebuilding|Rebuild/i.test(fText)) {
  fail(`F-grade subject comment should use the failing tone — "${fText}"`);
}
// Missing components fall back to the steady-effort sentence (still 3 sentences).
const missText = subjectComment(fProbe.id, "sub-math", 70, schemeForClass(fProbe.classId), {});
if (sentenceCount(missText) !== 3) fail(`missing-components comment has ${sentenceCount(missText)} sentences (want 3)`);

console.log(`Checked ${checked} students and ${subjectChecked} subject comments across ${classes.length} classes.`);
if (failures > 0) {
  console.error(`FAILED with ${failures} problem(s).`);
  process.exit(1);
}
console.log("All four-sentence comment assertions passed.");
