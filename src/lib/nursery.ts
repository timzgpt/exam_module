/**
 * Nursery / Early Years reporting data — classes, learners, template
 * defaults and seeded assessments.
 *
 * This module is deliberately self-contained (it imports only types and
 * demo-config, never demo-data): demo-data merges the nursery classes and
 * learners into its shared lookups, so existing screens keep working while
 * nursery classes stay out of the marks/deadlines/analytics pipelines that
 * only apply to marks-based classes.
 *
 * All learner names and assessment texts are FAKE demo data (repo rule 4).
 * Benchmarks, comment labels, scales and signatures are configuration —
 * the Report templates admin page edits them without code changes.
 */

import { DEMO_IDS } from "./demo-config";
import type {
  ClassRoom,
  CompetencyCode,
  CompetencyScale,
  NurseryAssessment,
  NurseryTemplateConfig,
  Student,
  TemplateLearningArea,
  ReportCycle,
} from "./types";

/* ================================================================
 * Deterministic PRNG (same algorithm as demo-data's helpers)
 * ================================================================ */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(xs: readonly T[], rnd: () => number): T =>
  xs[Math.floor(rnd() * xs.length)];

/* ================================================================
 * Early Years classes & learners (fake data)
 * ================================================================ */

/**
 * The Early Years class streams. They live OUTSIDE the marks-based
 * `classes` list: their reports are observation / competency based, and
 * keeping them separate means every existing marks screen is untouched.
 */
export const nurseryClasses: ClassRoom[] = [
  { id: "cls-baby", name: "Baby Class", level: "Baby Class", classTeacherId: "t4", room: "E1", noDivision: false },
  { id: "cls-kg1", name: "KG1", level: "KG1", classTeacherId: "t6", room: "E2", noDivision: false },
  { id: "cls-kg2", name: "KG2", level: "KG2", classTeacherId: "t8", room: "E3", noDivision: false },
  { id: "cls-kg3", name: "KG3", level: "KG3", classTeacherId: "t3", room: "E4", noDivision: false },
];

const NURSERY_SHORT: Record<string, string> = {
  "cls-baby": "baby",
  "cls-kg1": "kg1",
  "cls-kg2": "kg2",
  "cls-kg3": "kg3",
};

const BOYS = ["Baraka", "Chacha", "Daudi", "Emmanuel", "Fadhili", "Gideon", "Bartholomew", "Isaya", "Joel", "Kelvin", "Lameck", "Meshack"];
const GIRLS = ["Aisha", "Blessing", "Diana", "Esther", "Faith", "Gloria", "Hawa", "Irene", "Joyce", "Kesa", "Lucia", "Mariam"];
const GIVEN = ["Joseph", "Maria", "Robert", "Anna", "Peter", "Grace", "Simon", "Lucy", "Daniel", "Rose"];
const FAMILY = ["Mwakyusa", "Mhando", "Kowero", "Nyello", "Mugaya", "Simbila", "Mmbaga", "Nkya", "Kyomo", "Chuwa", "Lyaruu", "Mwakalinga"];

/** 8 learners per Early Years class — enough to exercise every template. */
function buildNurseryStudents(): Student[] {
  const list: Student[] = [];
  for (const cls of nurseryClasses) {
    const short = NURSERY_SHORT[cls.id];
    for (let i = 0; i < 8; i++) {
      const seed = hashStr(cls.id + i);
      const gender: "M" | "F" = seed % 2 === 0 ? "F" : "M";
      const first = gender === "F" ? GIRLS[(seed >>> 3) % GIRLS.length] : BOYS[(seed >>> 3) % BOYS.length];
      const given = GIVEN[(seed >>> 5) % GIVEN.length];
      const family = FAMILY[(seed >>> 7) % FAMILY.length];
      list.push({
        id: `${short}-${String(i + 1).padStart(2, "0")}`,
        classId: cls.id,
        name: `${first} ${given} ${family}`,
        admissionNo: `JS/2025/${String(2000 + (hashStr(cls.id + i) % 900))}`,
        gender,
      });
    }
  }
  return list;
}

export const nurseryStudents: Student[] = buildNurseryStudents();

/* ================================================================
 * Competency scale (KG2 / KG3 — configurable)
 * ================================================================ */

export const DEFAULT_COMPETENCY_SCALE: CompetencyScale = {
  name: "Early Years competency scale",
  levels: [
    { code: "B", label: "Beginner", description: "Starting to show the skill with adult support." },
    { code: "D", label: "Developing", description: "Shows the skill in familiar activities; needs occasional prompting." },
    { code: "C", label: "Competent", description: "Shows the skill independently in daily classroom life." },
    { code: "HC", label: "Highly Competent", description: "Consistently confident and often models the skill for peers." },
  ],
};

/* ================================================================
 * Default learning areas & benchmarks per template kind
 *
 * Invented early-years milestones following each template's described
 * structure — the exact wording of the school's printed samples is
 * entered through the Report templates admin page (task §2/§4).
 * ================================================================ */

function area(id: string, name: string, benchmarks: string[]): TemplateLearningArea {
  return {
    id,
    name,
    benchmarks: benchmarks.map((text, i) => ({ id: `${id}-b${i + 1}`, text })),
  };
}

/** The four Baby Class developmental areas (Templates A and B). */
export const BABY_AREAS: TemplateLearningArea[] = [
  area("baby-physical", "Physical Development", [
    "Climbs, runs and balances confidently on play equipment",
    "Holds crayons and makes purposeful marks",
    "Participates in music and movement sessions",
    "Feeds self and tidies up after meals",
  ]),
  area("baby-language", "Language Development", [
    "Responds to own name and simple instructions",
    "Uses words and short phrases to express needs",
    "Enjoys songs, rhymes and picture books",
    "Follows two-step directions",
  ]),
  area("baby-social", "Social and Emotional Development", [
    "Plays alongside and with other children",
    "Shares toys and takes turns with prompting",
    "Separates comfortably from the caregiver at drop-off",
    "Expresses feelings with words or gestures",
  ]),
  area("baby-cognitive", "Cognitive Development", [
    "Explores objects by stacking, posting and sorting",
    "Matches colours and shapes",
    "Completes simple inset puzzles",
    "Shows curiosity and asks about new things",
  ]),
];

export const KG1_AREAS: TemplateLearningArea[] = [
  area("kg1-arithmetic", "Kindergarten Arithmetic", [
    "Counts objects up to ten",
    "Recognises numerals 1 to 10",
    "Sorts objects by colour, shape and size",
    "Compares big and small, more and less",
  ]),
  area("kg1-language", "Early Language & Communication", [
    "Speaks in short full sentences",
    "Retells a simple story in order",
    "Recognises own name in print",
    "Listens to and follows classroom instructions",
  ]),
  area("kg1-creative", "Creative Arts and Sensory Play", [
    "Explores paint, dough and sensory trays",
    "Sings and moves to familiar songs",
    "Builds and constructs from imagination",
    "Describes textures, sounds and colours",
  ]),
  area("kg1-social", "Social Skills", [
    "Takes turns and shares materials",
    "Follows class routines with growing independence",
    "Plays cooperatively in small groups",
    "Cares for belongings and classroom materials",
  ]),
];

export const KG2_AREAS: TemplateLearningArea[] = [
  area("kg2-arithmetic", "Kindergarten Arithmetic", [
    "Counts and writes numbers 1 to 20",
    "Matches numerals to quantities",
    "Recognises basic shapes",
    "Orders objects by size and number",
    "Copies and completes simple patterns",
  ]),
  area("kg2-language", "Pre-Early Language & Communication", [
    "Identifies beginning letter sounds",
    "Traces and writes own name",
    "Answers simple questions about a story",
    "Speaks confidently in front of the class",
    "Pairs pictures with their beginning sounds",
  ]),
  area("kg2-lifeskills", "Early Lifeskills (Relations)", [
    "Greets adults and classmates politely",
    "Practises personal hygiene routines",
    "Helps with simple classroom chores",
    "Respects turn-taking and class rules",
  ]),
  area("kg2-creative", "Creative Art & Sensory Play", [
    "Draws and colours with growing control",
    "Models with clay or dough",
    "Participates in role play and pretend games",
    "Sings action songs with the group",
  ]),
  area("kg2-social", "Social & Developmental Learning Skills", [
    "Follows multi-step instructions",
    "Works independently on short tasks",
    "Cooperates in pair and group work",
    "Manages feelings with adult guidance",
  ]),
];

export const KG3_AREAS: TemplateLearningArea[] = [
  area("kg3-numeracy", "Early Numeracy", [
    "Counts and writes numbers 1 to 50",
    "Adds and subtracts within 10 using objects",
    "Recognises and names two-dimensional shapes",
    "Measures using non-standard units",
    "Completes number sequences",
  ]),
  area("kg3-language", "Early Language & Communication", [
    "Reads simple three-letter words",
    "Writes letters and own name legibly",
    "Retells stories in the right sequence",
    "Answers and asks questions in full sentences",
  ]),
  area("kg3-lifeskills", "Early Lifeskills (Relations)", [
    "Demonstrates good manners every day",
    "Takes care of personal belongings",
    "Shows empathy and kindness to classmates",
    "Follows safety rules indoors and outdoors",
  ]),
  area("kg3-sports", "Sports, Arts & Crafts", [
    "Runs, jumps and balances with control",
    "Handles balls, beanbags and hoops",
    "Creates artwork from own ideas",
    "Performs songs and dances confidently",
  ]),
  area("kg3-health", "Health & Environmental Care", [
    "Practises handwashing and personal hygiene",
    "Keeps the classroom and compound clean",
    "Names healthy foods and good habits",
    "Cares for plants and class animals",
  ]),
  area("kg3-culture", "Culture & Religion", [
    "Participates in morning devotions",
    "Knows simple prayers and religious songs",
    "Respects classmates of all backgrounds",
    "Takes part in national and cultural celebrations",
  ]),
];

const clone = (areas: TemplateLearningArea[]): TemplateLearningArea[] =>
  areas.map((a) => ({ ...a, benchmarks: a.benchmarks.map((b) => ({ ...b })) }));

const DEFAULT_SIGNATURES = (classTeacherName: string) => [
  { id: "sig-1", title: "Class Teacher", name: classTeacherName },
  { id: "sig-2", title: "Academic Dean", name: "Mrs. Agnes Nyoni" },
  { id: "sig-3", title: "Principal", name: "Mr. Emmanuel Sengo" },
];

/* ================================================================
 * Template registry
 * ================================================================ */

export type NurseryKind = NurseryTemplateConfig["kind"];

export const NURSERY_TEMPLATE_META: Record<
  NurseryKind,
  { label: string; description: string }
> = {
  "baby-class-a": {
    label: "Baby Class · Template A — Developmental Assessment",
    description:
      "Area of Development | Skills / milestones | Teacher's Comments table over four developmental areas, with the date of assessment and a general class teacher's comment. Descriptive observations only.",
  },
  "baby-class-b": {
    label: "Baby Class · Template B — Four Developmental Domains",
    description:
      "Domain | Developmental benchmark | Teacher's remarks over the four developmental domains, closing with class teacher's comments and authorizing signatures. Narrative remarks only.",
  },
  kg1: {
    label: "KG1 · Observation Report",
    description:
      "Four learning areas (Arithmetic, Language & Communication, Creative Arts, Social Skills) with benchmarks and teachers' remarks — observation-based, no grades.",
  },
  kg2: {
    label: "KG2 · Competency Report",
    description:
      "Five learning areas with benchmark-level competency grades (B/D/C/HC) and a dedicated comments section per learning area, concluding with the class teacher's comment.",
  },
  kg3: {
    label: "KG3 · Competency Report",
    description:
      "Six learning areas with benchmark-level competency grades (B/D/C/HC) and a dedicated comments section per learning area, concluding with the class teacher's comment.",
  },
};

/**
 * Default configuration for one class's template. `classTeacherName`
 * personalises the first signature slot; `assessmentDateLabel` carries the
 * Template A date caption.
 */
export function defaultTemplateConfig(
  kind: NurseryKind,
  classId: string,
  classTeacherName = "",
): NurseryTemplateConfig {
  const base = {
    kind,
    classId,
    signatures: DEFAULT_SIGNATURES(classTeacherName || "Class Teacher"),
  };
  switch (kind) {
    case "baby-class-a":
      return {
        ...base,
        title: "DEVELOPMENTAL ASSESSMENT REPORT",
        assessmentDateLabel: "Date of assessment",
        areas: clone(BABY_AREAS),
        scale: null,
        gradesPerBenchmark: false,
        areaRemarkLabel: "Teacher's Comments",
        areaCommentLabel: null,
        classTeacherCommentLabel: "Class teacher's general comment",
      };
    case "baby-class-b":
      return {
        ...base,
        title: "DEVELOPMENTAL DOMAINS REPORT",
        assessmentDateLabel: "Date of assessment",
        areas: clone(BABY_AREAS),
        scale: null,
        gradesPerBenchmark: false,
        areaRemarkLabel: "Teacher's remarks",
        areaCommentLabel: null,
        classTeacherCommentLabel: "Class teacher's comments",
      };
    case "kg1":
      return {
        ...base,
        title: "KINDERGARTEN 1 PROGRESS REPORT",
        assessmentDateLabel: "Date of assessment",
        areas: clone(KG1_AREAS),
        scale: null,
        gradesPerBenchmark: false,
        areaRemarkLabel: "Teachers' remarks",
        areaCommentLabel: null,
        classTeacherCommentLabel: "General class teacher's comment",
      };
    case "kg2":
      return {
        ...base,
        title: "KINDERGARTEN 2 TERMINAL REPORT",
        assessmentDateLabel: "Assessment period",
        areas: clone(KG2_AREAS),
        scale: { ...DEFAULT_COMPETENCY_SCALE, levels: DEFAULT_COMPETENCY_SCALE.levels.map((l) => ({ ...l })) },
        gradesPerBenchmark: true,
        areaRemarkLabel: null,
        areaCommentLabel: "Comments",
        classTeacherCommentLabel: "Class teacher's comment",
      };
    case "kg3":
      return {
        ...base,
        title: "KINDERGARTEN 3 TERMINAL REPORT",
        assessmentDateLabel: "Assessment period",
        areas: clone(KG3_AREAS),
        scale: { ...DEFAULT_COMPETENCY_SCALE, levels: DEFAULT_COMPETENCY_SCALE.levels.map((l) => ({ ...l })) },
        gradesPerBenchmark: true,
        areaRemarkLabel: null,
        areaCommentLabel: "Comments",
        classTeacherCommentLabel: "Class teacher's comment",
      };
  }
}

/** Which nursery templates an admin may assign to this class level. */
export function assignableKindsFor(classId: string): NurseryKind[] {
  const cls = nurseryClasses.find((c) => c.id === classId);
  if (!cls) return [];
  switch (cls.level) {
    case "Baby Class":
      return ["baby-class-a", "baby-class-b"];
    case "KG1":
      return ["kg1"];
    case "KG2":
      return ["kg2"];
    case "KG3":
      return ["kg3"];
    default:
      return [];
  }
}

/* ================================================================
 * Seeded assessments (deterministic, per student × cycle)
 * ================================================================ */

const REMARK_OPEN = [
  "{name} participates happily in {area} activities this term.",
  "{name} joins {area} sessions with growing confidence.",
  "{name} is an active participant during {area} time.",
  "{name} approaches {area} activities with curiosity and energy.",
];

const REMARK_CLOSE = [
  "Regular practice at home will build on this lovely progress.",
  "The class teacher will keep offering gentle challenges in this area.",
  "Continued encouragement at home and school will keep this growth steady.",
  "A very pleasing stage of development — well done.",
];

const AREA_COMMENT_POOLS = [
  "{name} shows steady growth in {area} and enjoys the daily activities.",
  "{name} works hard in {area}; the benchmark levels above reflect a solid term.",
  "{name} is building confidence in {area} week by week — pleasing to see.",
  "{name} responds well to encouragement in {area} and helps classmates along the way.",
];

const CLASS_COMMENT_OPEN = [
  "{name} has settled happily in {class} this term and joins every activity with enthusiasm.",
  "{name} has had a warm and busy term in {class}, making friends and trying new things.",
  "It has been a delight to watch {name} grow in confidence in {class} this term.",
];

const CLASS_COMMENT_GROWTH = [
  "Play-based learning continues to suit {name} very well.",
  "{name} follows the daily routine with growing independence.",
  "Group time, outdoor play and story sessions are clear favourites.",
];

const CLASS_COMMENT_CLOSE = [
  "We look forward to another happy and productive term ahead.",
  "Thank you for the continued support at home — it shows every day.",
  "Please keep reading and singing together over the break.",
];

/** Weighted competency draw tilted by the learner's seeded ability. */
function seededGrade(rnd: () => number, ability: number): CompetencyCode {
  const roll = rnd() + (ability - 50) / 160; // gentle tilt
  if (roll > 1.05) return "HC";
  if (roll > 0.55) return "C";
  if (roll > 0.2) return "D";
  return "B";
}

function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
}

/**
 * Deterministic assessment for one learner over one cycle. Seeded against
 * the DEFAULT config of the class's template kind; the persisted entry
 * store overrides individual fields after a teacher edits and saves.
 */
export function seedNurseryAssessment(
  classId: string,
  studentId: string,
  cycle: Pick<ReportCycle, "id" | "name" | "reportDate">,
): NurseryAssessment {
  const kind = defaultKindForNurseryClass(classId);
  const config = defaultTemplateConfig(kind, classId);
  const student = [...nurseryStudents].find((s) => s.id === studentId);
  const name = student?.name.split(" ")[0] ?? "The learner";
  const className = nurseryClasses.find((c) => c.id === classId)?.name ?? "class";
  const ability = hashStr(`ability|${studentId}`) % 100; // 0-99

  const areaRemarks: Record<string, string> = {};
  const areaComments: Record<string, string> = {};
  const benchmarkGrades: Record<string, CompetencyCode | null> = {};

  for (const a of config.areas) {
    const rnd = mulberry32(hashStr(`assess|${cycle.id}|${classId}|${studentId}|${a.id}`));
    const vars = { name, area: a.name.toLowerCase(), class: className };
    if (config.areaRemarkLabel) {
      areaRemarks[a.id] = `${fill(pick(REMARK_OPEN, rnd), vars)} ${fill(pick(REMARK_CLOSE, rnd), vars)}`;
    }
    if (config.areaCommentLabel) {
      areaComments[a.id] = fill(pick(AREA_COMMENT_POOLS, rnd), vars);
    }
    if (config.gradesPerBenchmark) {
      for (const b of a.benchmarks) {
        benchmarkGrades[b.id] = seededGrade(rnd, ability);
      }
    }
  }

  const ctRnd = mulberry32(hashStr(`assess|ct|${cycle.id}|${classId}|${studentId}`));
  const ctVars = { name, class: className };
  const classTeacherComment = [
    fill(pick(CLASS_COMMENT_OPEN, ctRnd), ctVars),
    fill(pick(CLASS_COMMENT_GROWTH, ctRnd), ctVars),
    fill(pick(CLASS_COMMENT_CLOSE, ctRnd), ctVars),
  ].join(" ");

  return {
    classId,
    studentId,
    cycleId: cycle.id,
    assessedOn: cycle.reportDate,
    areaRemarks,
    benchmarkGrades,
    areaComments,
    classTeacherComment,
  };
}

/** Default template kind for a nursery class level (before admin overrides). */
export function defaultKindForNurseryClass(classId: string): NurseryKind {
  const cls = nurseryClasses.find((c) => c.id === classId);
  switch (cls?.level) {
    case "KG1":
      return "kg1";
    case "KG2":
      return "kg2";
    case "KG3":
      return "kg3";
    default:
      return "baby-class-a";
  }
}

/** Demo anchor ids so deep links and the parent portal resolve. */
export const NURSERY_DEMO_IDS = {
  babyStudentId: "baby-01",
  kg2StudentId: "kg2-01",
} as const;

/** Guard against accidental use of the secondary demo student in nursery contexts. */
export const NURSERY_CLASS_IDS = nurseryClasses.map((c) => c.id);
export const DEMO_STUDENT_ID = DEMO_IDS.studentId;
