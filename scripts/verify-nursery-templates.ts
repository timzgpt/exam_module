/**
 * Early Years report-template system verification.
 * Run: bun scripts/verify-nursery-templates.ts
 *
 * Covers the invariants of task §2–§5 for the Nursery / Early Years cards:
 *   - template kind resolution per class level
 *   - KG3 period resolution (midterm vs terminal) and config keying
 *   - default config shape per template (titles, grades, comment labels, areas)
 *   - the B/D/C/HC competency scale (no numerical marks)
 *   - deterministic seeding keyed to the RESOLVED config's benchmark IDs
 *
 * Pure-layer only (lib/nursery, lib/report-templates): no React/zustand.
 */

import {
  DEFAULT_COMPETENCY_SCALE,
  assignableKindsFor,
  defaultKindForNurseryClass,
  defaultTemplateConfig,
  kg3AreasForPeriod,
  seedNurseryAssessment,
} from "../src/lib/nursery";
import {
  defaultTemplateKindFor,
  isPeriodVaryingKind,
  nurseryPeriodForCycle,
  templateConfigKey,
} from "../src/lib/report-templates";
import type { CompetencyCode } from "../src/lib/types";

let failures = 0;
function check(name: string, cond: boolean, detail = ""): void {
  if (!cond) {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? "  — " + detail : ""}`);
  } else {
    console.log(`ok    ${name}`);
  }
}

const cycleMid = { id: "cy1m", name: "Mid term - 2026", reportDate: "2026-02-16", kind: "mid-term" as const };
const cycleTerm = { id: "cy1", name: "Terminal Exam - 2026", reportDate: "2026-03-13", kind: "terminal" as const };

/* ── 1 · Template kind resolution (task §3) ─────────────────────── */
check("Baby Class default → baby-class-a", defaultTemplateKindFor("cls-baby") === "baby-class-a");
check("KG1 → kg1", defaultTemplateKindFor("cls-kg1") === "kg1");
check("KG2 → kg2", defaultTemplateKindFor("cls-kg2") === "kg2");
check("KG3 → kg3", defaultTemplateKindFor("cls-kg3") === "kg3");
check("defaultKindForNurseryClass baby → baby-class-a", defaultKindForNurseryClass("cls-baby") === "baby-class-a");

/* ── 2 · Period resolution (task §2 KG3) ────────────────────────── */
check("mid-term → midterm", nurseryPeriodForCycle({ kind: "mid-term" }) === "midterm");
check("monthly → midterm", nurseryPeriodForCycle({ kind: "monthly" }) === "midterm");
check("terminal → terminal", nurseryPeriodForCycle({ kind: "terminal" }) === "terminal");
check("annual → terminal", nurseryPeriodForCycle({ kind: "annual" }) === "terminal");

/* ── 3 · Period-varying kind + config keying ────────────────────── */
check("kg3 is period-varying", isPeriodVaryingKind("kg3") === true);
check("kg2 is NOT period-varying", isPeriodVaryingKind("kg2") === false);
check("baby-class-b is NOT period-varying", isPeriodVaryingKind("baby-class-b") === false);
check("kg3 config key carries period (midterm)", templateConfigKey("cls-kg3", "kg3", "midterm") === "cls-kg3::midterm");
check("kg3 config key carries period (terminal)", templateConfigKey("cls-kg3", "kg3", "terminal") === "cls-kg3::terminal");
check("baby config key is class-only", templateConfigKey("cls-baby", "baby-class-b", "terminal") === "cls-baby");
check("kg2 config key is class-only", templateConfigKey("cls-kg2", "kg2", "midterm") === "cls-kg2");

/* ── 4 · Assignable kinds (Baby Class keeps BOTH A and B) ────────── */
check("Baby Class offers A and B", assignableKindsFor("cls-baby").join(",") === "baby-class-a,baby-class-b");
check("KG1 offers only kg1", assignableKindsFor("cls-kg1").join(",") === "kg1");
check("KG3 offers only kg3", assignableKindsFor("cls-kg3").join(",") === "kg3");

/* ── 5 · Default config shape per template (task §2) ────────────── */
const a = defaultTemplateConfig("baby-class-a", "cls-baby", "Teacher");
check("A title", a.title === "STUDENT PROGRESS REPORT", a.title);
check("A has 4 areas", a.areas.length === 4);
check("A no scale", a.scale === null);
check("A no per-benchmark grades", a.gradesPerBenchmark === false);
check("A prints per-benchmark remark column", a.areaRemarkLabel !== null);
check("A has no per-area comment row", a.areaCommentLabel === null);

const b = defaultTemplateConfig("baby-class-b", "cls-baby", "Teacher");
check("B title is Terminal Report", b.title === "TERMINAL REPORT", b.title);
check("B has 4 areas", b.areas.length === 4);
check("B no scale", b.scale === null);
check("A and B are DISTINCT benchmark sets", a.areas[0].benchmarks[0].id !== b.areas[0].benchmarks[0].id);

const k1 = defaultTemplateConfig("kg1", "cls-kg1", "Teacher");
check("KG1 has 4 areas", k1.areas.length === 4);
check("KG1 no scale / no grades", k1.scale === null && k1.gradesPerBenchmark === false);

const k2 = defaultTemplateConfig("kg2", "cls-kg2", "Teacher");
check("KG2 has 5 areas", k2.areas.length === 5);
check("KG2 uses competency grades", k2.gradesPerBenchmark === true && k2.scale !== null);
check("KG2 has per-area comment row", k2.areaCommentLabel !== null);
check("KG2 has no narrative remark column", k2.areaRemarkLabel === null);

const k3m = defaultTemplateConfig("kg3", "cls-kg3", "Teacher", "midterm");
const k3t = defaultTemplateConfig("kg3", "cls-kg3", "Teacher", "terminal");
check("KG3 has 6 areas", k3m.areas.length === 6 && k3t.areas.length === 6);
check("KG3 uses competency grades", k3m.gradesPerBenchmark === true && k3m.scale !== null);
check("KG3 midterm title", k3m.title === "KINDERGARTEN 3 MIDTERM REPORT", k3m.title);
check("KG3 terminal title", k3t.title === "KINDERGARTEN 3 END OF TERM REPORT", k3t.title);

/* ── 6 · KG3 period sets genuinely differ (task §2 critical) ────── */
check("KG3 midterm numeracy counts to 20", k3m.areas[0].benchmarks[0].text.includes("0 to 20"));
check("KG3 terminal numeracy counts to 50", k3t.areas[0].benchmarks[0].text.includes("0 to 50"));
check("KG3 terminal numeracy is LONGER than midterm",
  k3t.areas[0].benchmarks.length > k3m.areas[0].benchmarks.length,
  `midterm=${k3m.areas[0].benchmarks.length} terminal=${k3t.areas[0].benchmarks.length}`);
check("KG3 midterm/terminal use distinct benchmark IDs",
  k3m.areas[0].benchmarks[0].id !== k3t.areas[0].benchmarks[0].id);
check("kg3AreasForPeriod matches config (midterm)",
  kg3AreasForPeriod("midterm")[0].benchmarks[0].id === k3m.areas[0].benchmarks[0].id);
check("kg3AreasForPeriod matches config (terminal)",
  kg3AreasForPeriod("terminal")[0].benchmarks[0].id === k3t.areas[0].benchmarks[0].id);

/* ── 7 · Competency scale is B/D/C/HC, no numeric marks ─────────── */
const codes = DEFAULT_COMPETENCY_SCALE.levels.map((l) => l.code).join(",");
check("scale codes are B,D,C,HC", codes === "B,D,C,HC", codes);

/* ── 8 · Seeding keyed to the RESOLVED config (task §5) ─────────── */
const VALID: CompetencyCode[] = ["B", "D", "C", "HC"];

const seedA = seedNurseryAssessment("cls-baby", "baby-01", cycleTerm, a);
const aBenchIds = a.areas.flatMap((ar) => ar.benchmarks.map((bm) => bm.id));
check("A seeds a remark for EVERY benchmark",
  aBenchIds.every((id) => (seedA.benchmarkRemarks[id] ?? "").trim().length > 0));
check("A seeds no grades", Object.keys(seedA.benchmarkGrades).length === 0);
check("A seeds no area comments", Object.keys(seedA.areaComments).length === 0);
check("A class-teacher comment is separate & non-empty", seedA.classTeacherComment.trim().length > 0);

const seedK2 = seedNurseryAssessment("cls-kg2", "kg2-01", cycleTerm, k2);
const k2BenchIds = k2.areas.flatMap((ar) => ar.benchmarks.map((bm) => bm.id));
check("KG2 seeds a valid grade for EVERY benchmark",
  k2BenchIds.every((id) => VALID.includes(seedK2.benchmarkGrades[id] as CompetencyCode)));
check("KG2 seeds a comment for EVERY area",
  k2.areas.every((ar) => (seedK2.areaComments[ar.id] ?? "").trim().length > 0));
check("KG2 seeds no narrative remarks", Object.keys(seedK2.benchmarkRemarks).length === 0);

/* ── 9 · Seeding is deterministic ───────────────────────────────── */
const seedA2 = seedNurseryAssessment("cls-baby", "baby-01", cycleTerm, a);
check("seeding is deterministic", JSON.stringify(seedA) === JSON.stringify(seedA2));

/* ── 10 · Switching template re-keys the seed (Baby A vs B) ─────── */
const seedB = seedNurseryAssessment("cls-baby", "baby-01", cycleTerm, b);
check("Baby B seed uses B's benchmark IDs",
  Object.keys(seedB.benchmarkRemarks).every((id) => id.startsWith("babyB")) &&
  Object.keys(seedB.benchmarkRemarks).length > 0);

/* ── 11 · KG3 periods store separate, non-colliding data ────────── */
const seedK3m = seedNurseryAssessment("cls-kg3", "kg3-01", cycleMid, k3m);
const seedK3t = seedNurseryAssessment("cls-kg3", "kg3-01", cycleTerm, k3t);
check("KG3 midterm grades key on midterm benchmark IDs",
  Object.keys(seedK3m.benchmarkGrades).every((id) => id.startsWith("kg3m")));
check("KG3 terminal grades key on terminal benchmark IDs",
  Object.keys(seedK3t.benchmarkGrades).every((id) => id.startsWith("kg3t")));
check("KG3 midterm & terminal benchmark IDs do not collide",
  Object.keys(seedK3m.benchmarkGrades).every((id) => !(id in seedK3t.benchmarkGrades)));

/* ── summary ────────────────────────────────────────────────────── */
console.log(
  failures === 0
    ? "\nAll nursery-template checks passed."
    : `\n${failures} check(s) FAILED.`,
);
process.exit(failures === 0 ? 0 : 1);
