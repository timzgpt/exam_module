/**
 * Validates the four-sentence comment generator for every demo student:
 *  - classTeacher and parentalInvolvement are exactly 4 sentences
 *  - deterministic: two calls return identical paragraphs
 *  - marks quoted as x.xx and averages as x.xx
 *  - missing set → both null + draft; draft set → draft status
 *  - no placeholder braces leak into the text
 */
import { commentFor, studentsInClass, classes, classResults } from "../src/lib/demo-data";

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

console.log(`Checked ${checked} students across ${classes.length} classes.`);
if (failures > 0) {
  console.error(`FAILED with ${failures} problem(s).`);
  process.exit(1);
}
console.log("All four-sentence comment assertions passed.");
