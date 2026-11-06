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
  NurseryPeriod,
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
 * The benchmark wording below is transcribed from the school's own
 * reference report cards (the six named sample files) — it is the
 * curriculum structure, NOT child data, so it is safe to ship as the
 * default. Administrators add/edit/reorder it through the Report
 * templates admin page (task §2/§4). Only learner names, remarks,
 * grades and comments are fake/seeded (repo rule 4).
 *
 * Baby Class has TWO distinct templates:
 *   A (Developmental Assessment) — skills-per-domain with a comment per skill
 *   B (Four Developmental Domains) — a benchmark set per domain with remarks
 * They carry different benchmark lists and are kept separate (task §2).
 * ================================================================ */

function area(id: string, name: string, benchmarks: string[]): TemplateLearningArea {
  return {
    id,
    name,
    benchmarks: benchmarks.map((text, i) => ({ id: `${id}-b${i + 1}`, text })),
  };
}

/**
 * Baby Class — Template A (Developmental Assessment, ref: "Raylynn Rajab").
 * Four developmental domains, each a list of observable skills; the teacher
 * writes a comment against every skill.
 */
export const BABY_A_AREAS: TemplateLearningArea[] = [
  area("babyA-physical", "Physical Development", [
    "Can eat independently",
    "Can throw, kick and catch objects",
    "Can walk forward",
    "Can jump with both feet and attempt to run",
    "Can hold / carry objects like a cup or a spoon",
    "Can climb stairs",
    "Can colour / decorate pictures and make brush paintings",
  ]),
  area("babyA-language", "Language Development", [
    "Understands and responds to simple instructions (common commands)",
    "Responds to simple questions using “yes” or “no” appropriately",
    "Responds when called by name",
    "Can sing songs and recite rhymes",
    "Can speak one or more words (vocabulary development)",
    "Identifies objects in the classroom and the environment",
    "Calls peers and teachers by their names or familiar terms",
    "Uses gestures along with words to communicate, like waving and pointing",
    "Identifies animals and imitates their sounds, like “moo”",
    "Identifies and mentions family members",
    "Uses dolls to discuss family roles (mommy, daddy, baby)",
  ]),
  area("babyA-social", "Social and Emotional Development", [
    "Shares toys with peers and cooperates with others with guidance",
    "Shows awareness and adjusts to new environments or routines with support",
    "Begins to follow simple classroom routines with reminders",
    "Shows positive social-interaction behaviours",
  ]),
  area("babyA-cognitive", "Cognitive Development", [
    "Recognises own properties such as a bag, a bottle and shoes",
    "Identifies basic body parts when named (head, hand, mouth)",
    "Imitates adult actions, like pretending to talk on a phone",
    "Recognises familiar people such as teachers and peers",
    "Can stay a day with no diapers",
  ]),
];

/**
 * Baby Class — Template B (Four Developmental Domains, ref: "Kwame-William").
 * The four domains each carry a set of developmental benchmarks with a
 * teacher's remark per benchmark.
 */
export const BABY_B_AREAS: TemplateLearningArea[] = [
  area("babyB-physical", "Physical Development", [
    "Gross motor skills",
    "Fine motor skills",
    "Hand-eye coordination",
    "Sensory & body awareness",
    "Oral motor skills (eating & communication)",
    "Balance & spatial awareness",
    "Self-care & independence",
  ]),
  area("babyB-language", "Language Development", [
    "Listening & comprehension",
    "Expressive language & vocabulary",
    "Communication & social language",
    "Phonological awareness & articulation",
    "Early literacy foundations",
    "Verbal and non-verbal communication",
  ]),
  area("babyB-social", "Social and Emotional Development", [
    "Self-awareness",
    "Emotional expression / regulation",
    "Relationships",
    "Social interaction & play",
    "Empathy / awareness of others",
    "Independence / confidence",
  ]),
  area("babyB-cognitive", "Cognitive Development", [
    "Problem solving / critical thinking",
    "Memory / recall",
    "Curiosity & exploration",
    "Concept development",
    "Attention & concentration",
    "Imagination & creativity",
  ]),
];

/** KG1 — Observation Report (ref: "Brandon Nashoni"). Four learning areas. */
export const KG1_AREAS: TemplateLearningArea[] = [
  area("kg1-arithmetic", "Kindergarten Arithmetic", [
    "Counts objects from 1–10 using one-to-one correspondence",
    "Number recognition and sequencing (0–8)",
    "Shape identification",
    "Understanding measurements, position and size (big / small, tall / short)",
    "Pattern recognition (colours and shapes)",
  ]),
  area("kg1-language", "Early Language & Communication", [
    "Letter sound recognition (s, a, t, i, p, n, c and k)",
    "Letter sound and picture matching (s for snake, a for ant)",
    "Self introduction",
    "Identifying fruits and their colours",
    "Identifying animals and their sounds",
  ]),
  area("kg1-creative", "Creative Arts and Sensory Play", [
    "Identifying body parts",
    "Body movement",
    "Colour recognition and sorting",
    "Moulding",
    "Family",
  ]),
  area("kg1-social", "Social Skills", [
    "Greetings and responding to greetings",
    "Expressing oneself",
    "Concentration and paying attention",
    "Interaction and sharing with others",
    "Listening and following instructions",
  ]),
];

/** KG2 — Competency Report (ref: "Ivy Loren George"). Five learning areas. */
export const KG2_AREAS: TemplateLearningArea[] = [
  area("kg2-arithmetic", "Kindergarten Arithmetic", [
    "Recognizes numbers from 1 to 20",
    "Writes the numbers from 1 to 20 with minimal support",
    "Writes the number that comes next correctly up to 10",
    "Identifies all the shapes and draws four basic shapes (circle, square, triangle, rectangle)",
    "Sorts objects according to shapes and matches them with the corresponding shape",
    "Counts and matches quantities of objects with numbers from 1 to 20",
    "Explores and compares objects by size (big / small) and height (tall / short)",
    "Identifies and compares items that are the same within a group",
    "Recognizes and compares objects that are different in a group",
  ]),
  area("kg2-language", "Pre-Early Language & Communication", [
    "Identifies lowercase letters and connects them to their phonetic sounds",
    "Recognizes and sorts the short vowels (a, e, i, o, u) within a group of letters",
    "Recognizes and connects images with the correct initial sounds",
    "Comprehends and reacts appropriately to everyday English instructions using context cues",
    "Writes own name independently, without visual support",
    "Identifies lowercase letters and their sounds through Jolly Phonics actions, songs or reading",
    "Begins to write the lowercase letter sounds with proper formation and minimal assistance",
    "Recognizes and identifies pre-writing strokes (circles, standing / sleeping lines, curves, slashes)",
    "Recognizes the initial sound of the first letter of their name",
    "Blends two sounds to form a word, such as “in”",
    "Identifies pictures, names, matches and writes CVC words (e.g. sun, win, box)",
  ]),
  area("kg2-lifeskills", "Early Lifeskills (Relations)", [
    "Engages in daily greetings and introduces self confidently",
    "Demonstrates understanding of good behaviour through actions and words",
    "Follows hygiene routines consistently, including washing hands before meals",
    "Carries out basic daily tasks independently (shelving books, placing homework folders)",
    "Demonstrates good habits by organizing toys after play",
    "Demonstrates responsibility in caring for personal belongings like water bottles and books",
    "Develops coordination and control of body and hand movements for writing and drawing",
  ]),
  area("kg2-creative", "Creative Art & Sensory Play", [
    "Recognizes various colours and connects them to objects in the environment",
    "Names different feelings and links them to personal or real-world experiences",
    "Draws and names different facial expressions (sad, happy, angry)",
    "Recognizes and identifies different types of weather (sunny, rainy, windy, snowy, cloudy, stormy)",
    "Classifies items such as games, clothes and food according to weather conditions",
    "Draws simple pictures using pre-writing lines (a circle for a ball or the sun)",
    "Identifies body parts during activities and action songs",
    "Explains the functions of different body parts correctly",
    "Transforms a circle shape into various objects (a ball, pizza or sun)",
    "Demonstrates critical thinking by drawing items that could grow on a tree",
    "Creates objects such as houses and slides using Jenga blocks, paper and bottle tops",
  ]),
  area("kg2-social", "Social & Developmental Learning Skills", [
    "Demonstrates an understanding of emotions by expressing them appropriately",
    "Shows good behaviour and treats others with kindness",
    "Develops resilience by persisting through challenges and recovering from setbacks",
    "Speaks with assurance and communicates well",
    "Demonstrates effort in following classroom rules every day",
    "Works well with others and demonstrates teamwork",
    "Shares and takes turns appropriately during group activities",
    "Interacts positively and plays cooperatively with peers",
    "Shows strong attention and involvement in tasks given",
    "Develops essential vocabulary and actively uses it in daily interactions",
    "Demonstrates confidence when making decisions",
    "Listens carefully and stays focused during activities and story time",
  ]),
];

/**
 * KG3 — Competency Report, MIDTERM set (ref: "Bryston Nashon", March 2026).
 * Six learning areas. KG3 is the only template whose benchmark set changes by
 * period (task §2 critical KG3 requirement): the End-of-Term set below extends
 * several areas. The renderer stays period-agnostic — the resolved config
 * carries whichever set the cycle's period selects.
 */
export const KG3_MIDTERM_AREAS: TemplateLearningArea[] = [
  area("kg3m-numeracy", "Early Numeracy", [
    "Recognizes and identifies numbers from 0 to 20",
    "Writes numbers from 0–20 sequentially with proper formation",
    "Rote-counts sequentially from 0–20",
    "Identifies and names basic 2D shapes (circles, squares, triangles, rectangles)",
    "Draws recognisable basic 2D shapes independently",
    "Recognizes and extends simple patterns using colours, shapes or objects",
    "Sorts objects by attributes (colour, shape, size) and explains the grouping",
    "Understands basic measurement concepts (length, height, weight, capacity)",
    "Compares measurement concepts using non-standard units (taller / shorter, heavier / lighter, more / less)",
  ]),
  area("kg3m-language", "Early Language & Communication", [
    "Understands simple questions and responds appropriately through words or actions",
    "Recognizes and distinguishes different sounds in the environment",
    "Understands and follows common commands",
    "Converses in different contexts and recalls or retells a story or experience",
    "Identifies and recognizes all letter sounds taught this period",
    "Identifies and differentiates beginning sounds in words",
    "Identifies and differentiates ending sounds in words",
    "Uses phonic awareness to sound out and read 3–4 letter words",
    "Reads the high-frequency (tricky) words introduced this period",
    "Reads and comprehends simple sentences using phonics, sight words and context clues",
    "Begins to form letters correctly and clearly with increasing control and legibility",
  ]),
  area("kg3m-lifeskills", "Early Lifeskills (Relations)", [
    "Introduces oneself confidently using full sentences",
    "Introduces others using simple sentences",
    "Demonstrates understanding and practice of good behaviours like sharing and taking turns",
    "Identifies and describes examples of good and bad behaviours in daily life",
    "Explains ways to be kind to people, animals and the environment",
    "Recognizes and names basic personal rights, such as the right to play and be safe",
    "Recognizes and describes basic personal responsibilities in different environments",
    "Understands roles and responsibilities of family and community members",
  ]),
  area("kg3m-sports", "Sports, Arts & Crafts", [
    "Sings songs and demonstrates basic vocal skills",
    "Identifies primary colours and mixes them to create secondary colours",
    "Colours within the lines and uses a variety of colours to complete a picture",
    "Demonstrates drawing skills by creating recognisable representations of objects",
    "Displays an understanding of different types of lines and shapes as elements of art",
    "Draws simple pictures and shapes to express ideas, observations or feelings",
  ]),
  area("kg3m-health", "Health & Environmental Care", [
    "Identifies and names different parts of the body",
    "Describes the basic functions of different body parts",
    "Demonstrates an understanding of personal hygiene practices like keeping the body clean",
    "Follows basic clothing-care routines (dressing appropriately, keeping clothes clean)",
    "Understands the importance of oral hygiene and demonstrates proper toothbrushing",
    "Recognizes and names different types of food (fruits, vegetables, grains, meat)",
    "Sorts foods into basic groups based on their types and benefits to the body",
  ]),
  area("kg3m-culture", "Culture & Religion", [
    "Recognises and identifies the national flag of Tanzania",
    "Identifies the colours of the national flag",
    "Describes the meaning of each colour on the national flag",
    "Recognises and names the national currency of Tanzania",
    "Identifies the map of Tanzania",
    "Identifies and describes the national emblem / coat of arms",
    "Identifies the national language of Tanzania as Swahili",
    "Understands the basic concept of patriotism and how to express pride in one's country",
    "Displays an understanding of the union of Tanganyika and Zanzibar",
  ]),
];

/**
 * KG3 — Competency Report, END-OF-TERM set (ref: "Jolene Bright Protas",
 * June 2026). Extends the Midterm set: numeracy to 50 with addition, more
 * advanced language, emotional-regulation lifeskills, musical instruments in
 * arts, food-preservation and kitchen utensils in health, and the national
 * anthem and leaders in culture.
 */
export const KG3_TERMINAL_AREAS: TemplateLearningArea[] = [
  area("kg3t-numeracy", "Early Numeracy", [
    "Recognizes and identifies numbers from 0 to 50",
    "Writes numbers from 0–50 sequentially with proper formation",
    "Rote-counts sequentially from 0–50",
    "Identifies and names basic 2D shapes (circles, squares, triangles, rectangles)",
    "Draws recognisable basic 2D shapes independently",
    "Sorts objects based on different attributes such as shape, colour and size",
    "Recognizes and extends simple patterns using colours, shapes or objects",
    "Understands basic measurement concepts (length, height, weight, capacity)",
    "Compares and demonstrates measurement concepts using non-standard units (taller / shorter, heavier / lighter, more / less)",
    "Identifies missing numbers in a sequence arranged from smallest to largest",
    "Understands addition words (add, more, altogether) and that the plus (+) sign means putting things together",
    "Adds real objects and single-digit numbers without assistance from the teacher",
  ]),
  area("kg3t-language", "Early Language & Communication", [
    "Understands simple questions and responds appropriately through words or actions",
    "Recognizes and distinguishes different sounds in the environment",
    "Understands and follows common commands and communication principles (polite words, greetings, farewells)",
    "Converses in different contexts and recalls or retells a story or experience",
    "Identifies and recognizes all letter sounds taught this term",
    "Associates letter sounds with their corresponding uppercase and lowercase letters",
    "Identifies and differentiates beginning sounds in words",
    "Identifies and differentiates ending sounds in words",
    "Uses phonic awareness to sound out and read 3–4 letter words",
    "Reads the high-frequency (tricky) words introduced this term",
    "Reads and comprehends simple sentences using phonics, sight words and context clues",
    "Forms letters correctly and clearly with increasing control and legibility",
    "Uses phonics knowledge to independently write simple 3–4 letter words",
  ]),
  area("kg3t-lifeskills", "Early Lifeskills (Relations)", [
    "Introduces oneself confidently using full sentences",
    "Introduces others using simple sentences",
    "Demonstrates understanding and practice of basic good behaviours such as sharing and taking turns",
    "Explains ways to be kind to people, animals and the environment",
    "Recognizes and names basic personal rights, such as the right to play and be safe",
    "Recognizes and describes basic personal responsibilities in different environments",
    "Understands roles and responsibilities of family and community members",
    "Identifies and demonstrates awareness of different feelings and emotions",
    "Demonstrates an understanding that all people and animals experience emotions",
    "Identifies and explains strategies for managing and controlling emotions in different situations",
  ]),
  area("kg3t-sports", "Sports, Arts & Crafts", [
    "Sings songs and demonstrates basic vocal skills",
    "Uses a variety of colours to colour pictures creatively and show artistic ability",
    "Colours within the lines and uses a variety of colours to complete a picture",
    "Demonstrates drawing skills by creating recognisable representations of various objects",
    "Names and demonstrates various games learnt",
    "Recognises and names different familiar musical instruments",
    "Displays an understanding of how musical instruments are used and the sounds they make",
  ]),
  area("kg3t-health", "Health & Environmental Care", [
    "Identifies and names different parts of the body",
    "Describes the basic functions of different body parts",
    "Demonstrates an understanding of personal hygiene practices such as washing hands and keeping the body clean",
    "Understands the importance of oral hygiene and demonstrates proper toothbrushing",
    "Recognizes and names different types of food (fruits, vegetables, grains, meat)",
    "Sorts foods into basic groups based on their types and benefits to the body",
    "Demonstrates an understanding of good table manners and why they are important",
    "Displays an understanding of how to preserve food and its importance",
    "Recognises and names different kitchen utensils",
  ]),
  area("kg3t-culture", "Culture & Religion", [
    "Recognises and identifies the national flag of Tanzania",
    "Identifies the colours of the national flag",
    "Describes the meaning of each colour on the national flag",
    "Is familiar with the national anthem of Tanzania",
    "Recognises and names the national currency of Tanzania",
    "Identifies the map of Tanzania",
    "Identifies the national language of Tanzania as Swahili",
    "Understands the basic concept of patriotism and how to express pride in one's country",
    "Displays an understanding of the union of Tanganyika and Zanzibar (the date, presidents and countries involved)",
    "Names the national leaders (President)",
    "Understands that every culture in Tanzania has its unique traditional foods",
  ]),
];

/** The KG3 benchmark set for an assessment period (task §2 critical KG3 req.). */
export function kg3AreasForPeriod(period: NurseryPeriod): TemplateLearningArea[] {
  return period === "midterm" ? KG3_MIDTERM_AREAS : KG3_TERMINAL_AREAS;
}

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
  /** KG3 only: selects the Midterm vs End-of-Term benchmark set and title. */
  period: NurseryPeriod = "terminal",
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
        title: "STUDENT PROGRESS REPORT",
        assessmentDateLabel: "Date of assessment",
        areas: clone(BABY_A_AREAS),
        scale: null,
        gradesPerBenchmark: false,
        areaRemarkLabel: "Teacher's Comments",
        areaCommentLabel: null,
        classTeacherCommentLabel: "Class teacher's general comment",
      };
    case "baby-class-b":
      return {
        ...base,
        title: "TERMINAL REPORT",
        assessmentDateLabel: "Date of assessment",
        areas: clone(BABY_B_AREAS),
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
        title:
          period === "midterm"
            ? "KINDERGARTEN 3 MIDTERM REPORT"
            : "KINDERGARTEN 3 END OF TERM REPORT",
        assessmentDateLabel: "Assessment period",
        areas: clone(kg3AreasForPeriod(period)),
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

const REMARK_PER_BENCHMARK = [
  "{name} shows this skill confidently in daily classroom activities.",
  "{name} is developing this well and needs only occasional prompting.",
  "{name} demonstrates this benchmark with growing independence.",
  "{name} approaches this with curiosity and improving control.",
  "{name} performs this skill happily during group and play sessions.",
  "{name} is making steady progress with this milestone.",
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
  /**
   * The RESOLVED template config (admin assignment + edits). Passing it keeps
   * the seed aligned with the benchmark IDs the renderer actually shows — so
   * switching Baby Class between Template A and B, or editing benchmarks,
   * still produces demo remarks/grades for the right benchmarks.
   */
  config?: NurseryTemplateConfig,
): NurseryAssessment {
  const resolved =
    config ?? defaultTemplateConfig(defaultKindForNurseryClass(classId), classId);
  const student = [...nurseryStudents].find((s) => s.id === studentId);
  const name = student?.name.split(" ")[0] ?? "The learner";
  const className = nurseryClasses.find((c) => c.id === classId)?.name ?? "class";
  const ability = hashStr(`ability|${studentId}`) % 100; // 0-99

  const benchmarkRemarks: Record<string, string> = {};
  const areaComments: Record<string, string> = {};
  const benchmarkGrades: Record<string, CompetencyCode | null> = {};

  for (const a of resolved.areas) {
    const rnd = mulberry32(hashStr(`assess|${cycle.id}|${classId}|${studentId}|${a.id}`));
    const vars = { name, area: a.name.toLowerCase(), class: className };
    // Templates A / B / KG1 carry one narrative remark per benchmark.
    if (resolved.areaRemarkLabel) {
      for (const b of a.benchmarks) {
        benchmarkRemarks[b.id] = fill(pick(REMARK_PER_BENCHMARK, rnd), vars);
      }
    }
    // KG2 / KG3 carry one dedicated comment per learning area.
    if (resolved.areaCommentLabel) {
      areaComments[a.id] = fill(pick(AREA_COMMENT_POOLS, rnd), vars);
    }
    // KG2 / KG3 carry a competency grade per benchmark.
    if (resolved.gradesPerBenchmark) {
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
    benchmarkRemarks,
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
