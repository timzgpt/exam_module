import { DEFAULT_SCHEME_ID, divisionFor, gradeFor, subjectTotal, subjectsPassed } from "./grading";
import { computeAttendanceSummary, possibleSchoolDays } from "./attendance";
import { ACADEMIC_APPROVER, DEMO_IDS } from "./demo-config";
import { nurseryClasses, nurseryStudents } from "./nursery";
import type {
  AttendanceSummary,
  AttendanceStatus,
  BookingSlot,
  BatchRun,
  ClassApproval,
  ClassRelease,
  ClassRoom,
  ClassSubject,
  CommentRecord,
  DivisionResult,
  Exam,
  GradeBoundary,
  GradingScheme,
  MarksDeadline,
  MarkStatusCode,
  ReportCycle,
  Student,
  StudentTarget,
  Subject,
  Teacher,
} from "./types";

/* ================================================================
 * Deterministic PRNG helpers (demo data must be stable across pages)
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

/* ================================================================
 * Subjects · teachers · classes · students
 * ================================================================ */

export const subjects: Subject[] = [
  { id: "s1", name: "Mathematics", code: "MTH", department: "Mathematics" },
  { id: "s2", name: "English", code: "ENG", department: "Languages" },
  { id: "s3", name: "Kiswahili", code: "KIS", department: "Languages" },
  { id: "s4", name: "Physics", code: "PHY", department: "Sciences" },
  { id: "s5", name: "Chemistry", code: "CHM", department: "Sciences" },
  { id: "s6", name: "Biology", code: "BIO", department: "Sciences" },
  { id: "s7", name: "Geography", code: "GEO", department: "Humanities" },
  { id: "s8", name: "History", code: "HIS", department: "Humanities" },
  { id: "s9", name: "Computer Studies", code: "CST", department: "ICT" },
];

export const subjectById = (id: string): Subject | undefined =>
  subjects.find((s) => s.id === id);

export const teachers: Teacher[] = [
  { id: "t1", name: "Mr. James Mushi", initials: "JM", subjectIds: ["s1"], role: "Teacher · HOD Mathematics" },
  { id: "t2", name: "Ms. Grace Ndosi", initials: "GN", subjectIds: ["s2"], role: "Teacher · HOD Languages" },
  { id: "t3", name: "Mr. Emanuel Mahenge", initials: "EM", subjectIds: ["s3"], role: "Teacher" },
  { id: "t4", name: "Mrs. Fatma Chacha", initials: "FC", subjectIds: ["s6"], role: "Teacher · HOD Sciences" },
  { id: "t5", name: "Mr. Daniel Lyimo", initials: "DL", subjectIds: ["s4"], role: "Teacher" },
  { id: "t6", name: "Ms. Precious Kiwanga", initials: "PK", subjectIds: ["s5"], role: "Teacher" },
  { id: "t7", name: "Mr. Samuel Kayombo", initials: "SK", subjectIds: ["s8"], role: "Teacher · HOD Humanities" },
  { id: "t8", name: "Ms. Rose Msigwa", initials: "RM", subjectIds: ["s7"], role: "Teacher" },
  { id: "t9", name: "Mr. Thomas Mrisho", initials: "TM", subjectIds: ["s9"], role: "Teacher · HOD ICT" },
  { id: "t10", name: "Mrs. Agnes Nyoni", initials: "AN", subjectIds: [], role: "Deputy Head · Academics" },
];

export const teacherById = (id: string | null | undefined): Teacher | undefined =>
  teachers.find((t) => t.id === id);

/**
 * The 12 real class streams span Primary Grades 1–7 and Secondary Forms 1–4;
 * the demo ships a representative subset (one primary, six secondary).
 * `noDivision` mirrors the Report Overview "No Division" row: Form 2A's
 * teacher has set it to Yes, so Points/Division are hidden on those cards.
 */
export const classes: ClassRoom[] = [
  { id: "cls-p5", name: "Standard 5A", level: "Standard 5", classTeacherId: "t7", room: "A2", noDivision: false },
  { id: "cls-1a", name: "Form 1A", level: "Form 1", classTeacherId: "t3", room: "B2", noDivision: false },
  { id: "cls-1b", name: "Form 1B", level: "Form 1", classTeacherId: "t8", room: "B4", noDivision: false },
  { id: "cls-2a", name: "Form 2A", level: "Form 2", classTeacherId: "t6", room: "B7", noDivision: true },
  { id: DEMO_IDS.classId, name: "Form 3A", level: "Form 3", classTeacherId: "t2", room: "C1", noDivision: false },
  { id: "cls-3b", name: "Form 3B", level: "Form 3", classTeacherId: "t5", room: "C3", noDivision: false },
  { id: "cls-4a", name: "Form 4A", level: "Form 4", classTeacherId: "t1", room: "A5", noDivision: false },
];

/** Level strings starting with "Form" are secondary (NECTA CSEE); the rest are primary. */
export function isPrimaryClass(classId: string): boolean {
  const level = classById(classId)?.level ?? "";
  return !level.startsWith("Form");
}

/**
 * Every class the app knows: the marks-based classes (which drive all
 * marks/deadlines/analytics pipelines) plus the Early Years classes, whose
 * report cards come from the observation/competency template engines
 * (see lib/report-templates.ts). Class pickers that must offer the whole
 * school — the header switcher, the card preview and the template admin —
 * render from this list; pipeline screens keep using `classes`.
 */
export const allClasses: ClassRoom[] = [...classes, ...nurseryClasses];

/**
 * Grading scheme for a class: the Primary A-E bands for Standard classes,
 * the NECTA CSEE bands otherwise. Every grade lookup, distribution and pass
 * rate goes through this so a class is never graded with the wrong bands.
 */
export function schemeForClass(classId: string): GradingScheme {
  return isPrimaryClass(classId) ? schemeById("gs-primary-2026") : defaultScheme;
}

export const classById = (id: string): ClassRoom | undefined =>
  classes.find((c) => c.id === id) ?? nurseryClasses.find((c) => c.id === id);

export function classNameOf(id: string): string {
  return classById(id)?.name ?? "Class";
}

const MALE_NAMES = ["Juma", "Baraka", "Emmanuel", "David", "Frank", "Godlisten", "Hamisi", "Isaya", "Kelvin", "Lucas", "Michael", "Nuru", "Omari", "Peter", "Rajabu", "Simon", "Tumaini", "Yusuph"];
const FEMALE_NAMES = ["Amina", "Neema", "Grace", "Fatuma", "Zawadi", "Happy", "Doreen", "Salma", "Editha", "Vivian", "Rehema", "Joyce", "Mwanahiba", "Upendo", "Winnie", "Angelina", "Beatrice", "Catherine"];
const MIDDLE_NAMES = ["Joseph", "John", "Charles", "Adam", "Robert", "Martin", "Elias", "Samwel", "Daniel", "Patrick", "Musa", "Abdallah"];
const SURNAMES = ["Mwakalinga", "Kimaro", "Mushi", "Ndaki", "Mahenge", "Lyimo", "Kiwanga", "Kayombo", "Msigwa", "Mrisho", "Nyoni", "Chacha", "Ndosi", "Massawe", "Shirima", "Kessy", "Mbwana", "Sengo", "Temba", "Mlaki", "Swai", "Macha", "Kalinga", "Nyoni"];

const CLASS_SHORT: Record<string, string> = {
  "cls-p5": "p5a",
  "cls-1a": "f1a",
  "cls-1b": "f1b",
  "cls-2a": "f2a",
  [DEMO_IDS.classId]: "f3a",
  "cls-3b": "f3b",
  "cls-4a": "f4a",
};

function buildStudents(): Student[] {
  const list: Student[] = [];
  for (const cls of classes) {
    const short = CLASS_SHORT[cls.id];
    for (let i = 0; i < 12; i++) {
      const seed = hashStr(cls.id + i);
      const gender: "M" | "F" = seed % 2 === 0 ? "F" : "M";
      const pool = gender === "F" ? FEMALE_NAMES : MALE_NAMES;
      const first = pool[(seed >>> 3) % pool.length];
      const middle = MIDDLE_NAMES[(seed >>> 5) % MIDDLE_NAMES.length];
      const surname = SURNAMES[(seed >>> 7) % SURNAMES.length];
      const id = cls.id === DEMO_IDS.classId && i === 0 ? DEMO_IDS.studentId : `${short}-${String(i + 1).padStart(2, "0")}`;
      list.push({
        id,
        classId: cls.id,
        name: cls.id === DEMO_IDS.classId && i === 0 ? "Amina Joseph Mwakalinga" : `${first} ${middle} ${surname}`,
        admissionNo: `JS/2024/${String(1000 + hashStr(cls.id + i) % 9000)}`,
        gender,
      });
    }
  }
  return list;
}

export const students: Student[] = [...buildStudents(), ...nurseryStudents];

export const studentsInClass = (classId: string): Student[] =>
  students.filter((s) => s.classId === classId);

export const studentById = (id: string): Student | undefined =>
  students.find((s) => s.id === id);

/* ================================================================
 * Grading scheme
 * ================================================================ */

/**
 * Secondary scheme (default): NECTA CSEE style bands. Lower points = better
 * performance; subject points feed the division calculation (best 7).
 */
const boundaries: GradeBoundary[] = [
  { grade: "A", min: 75, max: 100, points: 1, remark: "Outstanding" },
  { grade: "B", min: 65, max: 74, points: 2, remark: "Very Good" },
  { grade: "C", min: 45, max: 64, points: 3, remark: "Good" },
  { grade: "D", min: 30, max: 44, points: 4, remark: "Satisfactory" },
  { grade: "F", min: 0, max: 29, points: 5, remark: "Can do better" },
];

/**
 * Primary scheme (Grades 1-7). Primary reports never show points — the
 * `points` values below exist only so GradeBoundary stays uniform for the
 * editor; every points UI is gated off via `usesPoints: false`.
 */
const primaryBoundaries: GradeBoundary[] = [
  { grade: "A", min: 81, max: 100, points: 1, remark: "Outstanding" },
  { grade: "B", min: 61, max: 80, points: 2, remark: "Very Good" },
  { grade: "C", min: 41, max: 60, points: 3, remark: "Good" },
  { grade: "D", min: 21, max: 40, points: 4, remark: "Satisfactory" },
  { grade: "E", min: 0, max: 20, points: 5, remark: "Can do better" },
];

export const gradingSchemes: GradingScheme[] = [
  {
    id: DEFAULT_SCHEME_ID,
    name: "Secondary Scheme · NECTA CSEE · 2026",
    academicYear: "2026",
    passMark: 30,
    boundaries,
    // Forms 1-4: subject points feed the best-7 division calculation.
    usesPoints: true,
  },
  {
    id: "gs-primary-2026",
    name: "Primary Scheme · Grades 1-7 · 2026",
    academicYear: "2026",
    passMark: 21,
    boundaries: primaryBoundaries,
    // Grades 1-7: no points, no points total and no division on reports.
    usesPoints: false,
  },
];

export const defaultScheme: GradingScheme = gradingSchemes[0];
export const schemeById = (id: string): GradingScheme =>
  gradingSchemes.find((s) => s.id === id) ?? defaultScheme;

/* ================================================================
 * Exams
 * ================================================================ */

function buildSittings(prefix: string, startDay: number): Exam["sittings"] {
  const venues = ["Main Hall", "Room 12", "Room 14", "Room 21", "Science Lab 1", "Room 8"];
  return subjects.map((s, i) => {
    const day = startDay + Math.floor(i / 2);
    return {
      subjectId: s.id,
      date: `2026-03-${String(day).padStart(2, "0")}`,
      startTime: i % 2 === 0 ? "08:00" : "10:30",
      durationMin: s.id === "s2" || s.id === "s3" ? 150 : 120,
      invigilatorId: teachers[i % 9].id,
      venue: venues[i % venues.length],
    };
  });
}

export const exams: Exam[] = [
  {
    id: "ex-1",
    name: "Monthly Test 1",
    term: "Term 1",
    academicYear: "2026",
    type: "Monthly test",
    startDate: "2026-02-09",
    endDate: "2026-02-10",
    status: "completed",
    sittings: [
      { subjectId: "s1", date: "2026-02-09", startTime: "08:00", durationMin: 90, invigilatorId: "t1", venue: "Room 12" },
      { subjectId: "s2", date: "2026-02-09", startTime: "10:30", durationMin: 90, invigilatorId: "t2", venue: "Room 12" },
      { subjectId: "s3", date: "2026-02-10", startTime: "08:00", durationMin: 90, invigilatorId: "t3", venue: "Room 14" },
    ],
  },
  {
    id: "ex-2",
    name: "Mid-Term Examinations",
    term: "Term 1",
    academicYear: "2026",
    type: "Mid-term",
    startDate: "2026-02-23",
    endDate: "2026-02-27",
    status: "completed",
    sittings: buildSittings("mt", 23),
  },
  {
    id: "ex-3",
    name: "Terminal Examinations",
    term: "Term 1",
    academicYear: "2026",
    type: "Terminal",
    startDate: "2026-03-16",
    endDate: "2026-03-24",
    status: "scheduled",
    sittings: buildSittings("tm", 16),
  },
  {
    id: "ex-4",
    name: "Mock Examinations (Form 4)",
    term: "Term 2",
    academicYear: "2026",
    type: "Mock",
    startDate: "2026-05-11",
    endDate: "2026-05-22",
    status: "draft",
    sittings: buildSittings("mk", 11).slice(0, 6),
  },
];

/* ================================================================
 * Report cycles
 * ================================================================ */

export const cycles: ReportCycle[] = [
  {
    id: "cy0",
    name: "Terminal Exam - 2025",
    term: "Term 3",
    academicYear: "2025",
    kind: "terminal",
    startDate: "2025-09-08",
    endDate: "2025-11-28",
    status: "released",
    closingDate: "2025-11-21",
    releaseDate: "2025-12-05",
    parentsDayDate: "2025-11-14",
    reportDate: "2025-12-01",
    schoolOpensDate: "2026-01-12",
    attendanceFrom: "2025-09-08",
    attendanceTo: "2025-11-28",
  },
  {
    // A Mid-Term report cycle so both chart engines ship visible in the
    // demo: mid-term cards use the 3:1 chart with the in-image legend and
    // the Best-Improvement badge on primary classes (chart prompt §8/§9).
    id: "cy1m",
    name: "Mid term - 2026",
    term: "Term 1",
    academicYear: "2026",
    kind: "mid-term",
    startDate: "2026-01-12",
    endDate: "2026-02-20",
    status: "released",
    closingDate: "2026-02-13",
    releaseDate: "2026-02-20",
    parentsDayDate: "2026-02-27",
    reportDate: "2026-02-16",
    schoolOpensDate: "2026-02-23",
    attendanceFrom: "2026-01-12",
    attendanceTo: "2026-02-13",
  },
  {
    id: DEMO_IDS.reportCycleId,
    name: "Terminal Exam - 2026",
    term: "Term 1",
    academicYear: "2026",
    kind: "terminal",
    startDate: "2026-01-12",
    endDate: "2026-04-03",
    status: "review",
    closingDate: "2026-03-13",
    releaseDate: "2026-04-06",
    parentsDayDate: "2026-03-27",
    // A3.8: report date + school opens are printed on the card; the
    // attendance period runs from term start to the last full school day.
    reportDate: "2026-03-13",
    schoolOpensDate: "2026-04-27",
    attendanceFrom: "2026-01-12",
    attendanceTo: "2026-03-11",
  },
  {
    // The Annual Exam cycle — the third name in the "{Exam} - {year}"
    // convention. Annual cards run the same Terminal engine as end-of-term
    // cycles (see ReportCycle.kind in lib/types.ts).
    id: "cy2",
    name: "Annual Exam - 2026",
    term: "Term 3",
    academicYear: "2026",
    kind: "annual",
    startDate: "2026-09-07",
    endDate: "2026-11-20",
    status: "preparation",
    closingDate: "2026-11-13",
    releaseDate: "2026-11-27",
    parentsDayDate: "2026-11-06",
    reportDate: "2026-11-23",
    schoolOpensDate: "2027-01-11",
    attendanceFrom: "2026-09-07",
    attendanceTo: "2026-11-20",
  },
];

export const cycleById = (id: string): ReportCycle | undefined =>
  cycles.find((c) => c.id === id);

export const currentCycle = cycles.find((c) => c.id === DEMO_IDS.reportCycleId)!;

/* ================================================================
 * Marks (seeded, consistent across every page)
 * ================================================================ */

/** Subjects that are subsidiary (optional) for every class in the demo. */
const SUBSIDIARY_SUBJECT_IDS = new Set(["s9"]);

/** Students forced onto a subsidiary subject regardless of the seeded draw. */
const ENROL_OVERRIDES = new Set(["st1|s9", "f1a-04|s9"]);

/** Pairs with missing entries so deadline tracker / readiness look real. */
const NULL_PATCHES: Record<string, string[] | "ALL"> = {
  "cls-4a|s5": ["f4a-03", "f4a-07", "f4a-10", "f4a-11"],
  "cls-2a|s7": "ALL",
};

/** DISQ malpractice: a real zero that IS included in averages (0.0). */
const DISQ_PATCHES = new Set(["cls-1a|s2|f1a-04"]);

/**
 * Is this student enrolled in the class subject? Core subjects are compulsory
 * (every student takes them); subsidiaries are opt-in per student, seeded so
 * every page sees the same enrolment.
 */
export function isEnrolledIn(
  classId: string,
  subjectId: string,
  studentId: string,
): boolean {
  if (!SUBSIDIARY_SUBJECT_IDS.has(subjectId)) return true;
  if (ENROL_OVERRIDES.has(`${studentId}|${subjectId}`)) return true;
  return hashStr(`enrol|${classId}|${subjectId}|${studentId}`) % 10 < 6;
}

const marksCache = new Map<string, Record<string, number | null>>();

export function getMarks(
  classId: string,
  subjectId: string,
): Record<string, number | null> {
  const key = `${classId}|${subjectId}`;
  const cached = marksCache.get(key);
  if (cached) return cached;

  const rnd = mulberry32(hashStr(key));
  const classOffset = (hashStr(classId) % 13) - 6;
  const subjectOffset = (hashStr(subjectId) % 15) - 7;
  const result: Record<string, number | null> = {};
  for (const s of studentsInClass(classId)) {
    if (!isEnrolledIn(classId, subjectId, s.id)) {
      result[s.id] = null; // not taking a subsidiary subject — dash everywhere
      continue;
    }
    const ability = 44 + (hashStr(s.id) % 46); // 44-89 latent ability
    const jitter = rnd() * 18 - 9;
    const ca = Math.max(0, Math.min(100, Math.round(ability + classOffset + jitter)));
    const exam = Math.max(0, Math.min(100, ca + Math.round(rnd() * 16 - 8)));
    // Subject total via the class subject's own 25/75 split so components
    // round-trip exactly (Monthly CA 25% + Exam 75% for every demo subject).
    const cs = classSubjectsFor(classId).find((c) => c.subjectId === subjectId);
    result[s.id] = subjectTotal(ca, exam, cs?.caMarks ?? 25, cs?.examMarks ?? 75);
  }
  const patch = NULL_PATCHES[key];
  if (patch === "ALL") {
    for (const sid of Object.keys(result)) result[sid] = null;
  } else if (patch) {
    for (const sid of patch) result[sid] = null;
  }
  for (const sid of Object.keys(result)) {
    if (DISQ_PATCHES.has(`${key}|${sid}`)) result[sid] = 0; // DISQ is a real zero
  }
  marksCache.set(key, result);
  return result;
}

/* ----------------------------------------------------------------
 * Mark status codes and CA/Exam components
 * ---------------------------------------------------------------- */

/** Per-student status codes shown in the marks grid instead of a blank. */
const STATUS_PATCHES: Record<string, Record<string, MarkStatusCode>> = {
  "cls-4a|s5": { "f4a-03": "ABS", "f4a-07": "ABS", "f4a-10": "NA", "f4a-11": "NA" },
};

/**
 * Status code typed in place of a mark. ABS/NA/NR/PENDING are treated as
 * blank (null); DISQ is a real zero. Non-enrolled subsidiary students show
 * "—" and never carry a status.
 */
export function markStatusOf(
  classId: string,
  subjectId: string,
  studentId: string,
): MarkStatusCode | null {
  if (`${classId}|${subjectId}` === "cls-2a|s7") return "PENDING";
  if (DISQ_PATCHES.has(`${classId}|${subjectId}|${studentId}`)) return "DISQ";
  return STATUS_PATCHES[`${classId}|${subjectId}`]?.[studentId] ?? null;
}

export interface MarkComponents {
  enrolled: boolean;
  /** Monthly / continuous assessment, entered out of 100 (weighted 25%). */
  ca: number | null;
  /** End-of-term written exam, entered out of 100 (weighted 75%). */
  exam: number | null;
  status: MarkStatusCode | null;
}

const componentsCache = new Map<string, Record<string, MarkComponents>>();

/**
 * CA / Exam components per student. Components round-trip exactly to the
 * stored subject total via subjectTotal(ca, exam, w1, w2) using the class
 * subject's own 25/75 assessment split.
 */
export function getComponents(
  classId: string,
  subjectId: string,
): Record<string, MarkComponents> {
  const key = `${classId}|${subjectId}`;
  const cached = componentsCache.get(key);
  if (cached) return cached;
  const marks = getMarks(classId, subjectId);
  const cs = classSubjectsFor(classId).find((c) => c.subjectId === subjectId);
  const w1 = (cs?.caMarks ?? 25) / 100;
  const w2 = (cs?.examMarks ?? 75) / 100;
  const result: Record<string, MarkComponents> = {};
  for (const [studentId, total] of Object.entries(marks)) {
    const enrolled = isEnrolledIn(classId, subjectId, studentId);
    const status = markStatusOf(classId, subjectId, studentId);
    if (total === null || !enrolled) {
      result[studentId] = { enrolled, ca: null, exam: null, status };
      continue;
    }
    // Invert the weighting exactly: search integer CA/Exam pairs near the
    // total until round(CA x w1 + Exam x w2, 2) reproduces the total.
    let ca = Math.max(0, Math.min(100, Math.round(total)));
    let exam = Math.max(0, Math.min(100, Math.round((total - w1 * ca) / w2)));
    for (let c = Math.max(0, Math.round(total) - 10); c <= Math.min(100, Math.round(total) + 10); c++) {
      const e = Math.round((total - w1 * c) / w2);
      if (e < 0 || e > 100) continue;
      if (Math.round((w1 * c + w2 * e) * 100) / 100 === total) {
        ca = c;
        exam = e;
        break;
      }
    }
    result[studentId] = { enrolled, ca, exam, status };
  }
  componentsCache.set(key, result);
  return result;
}

export function subjectTeacherOf(subjectId: string, classId: string): Teacher | undefined {
  const subject = subjectById(subjectId);
  if (!subject) return undefined;
  return (
    teachers.find((t) => t.subjectIds.includes(subjectId)) ??
    teacherById(classById(classId)?.classTeacherId)
  );
}

/* ----------------------------------------------------------------
 * Previous-term CA (C1) — feeds the Primary most-improved highlight
 * ---------------------------------------------------------------- */

const prevCaCache = new Map<string, Record<string, number | null>>();

/**
 * Last term's continuous-assessment mark (C1) per student, used by the
 * Primary report card's most-improved calculation (C2 − C1). Seeded around
 * this term's CA so the delta lands in a plausible −10…+18 band. Students
 * without a previous record (new arrivals) get null — their delta counts as
 * 0, never as an improvement.
 */
export function prevCaOf(
  classId: string,
  subjectId: string,
): Record<string, number | null> {
  const key = `prevca|${classId}|${subjectId}`;
  const cached = prevCaCache.get(key);
  if (cached) return cached;
  const comps = getComponents(classId, subjectId);
  const result: Record<string, number | null> = {};
  for (const [studentId, comp] of Object.entries(comps)) {
    if (!comp.enrolled || comp.ca === null) {
      result[studentId] = null;
      continue;
    }
    const delta = (hashStr(`prev|${key}|${studentId}`) % 29) - 10; // −10…+18
    result[studentId] = Math.max(0, Math.min(100, comp.ca - delta));
  }
  prevCaCache.set(key, result);
  return result;
}

/* ================================================================
 * Class subjects (per-class allocation in report-card order)
 * ================================================================ */

const PERIODS_BY_SUBJECT = [5, 4, 4, 3, 3, 3, 2, 2, 2];

const classSubjectsCache = new Map<string, ClassSubject[]>();

/**
 * Ordered class-subject allocation for a class. Array position IS the subject
 * order used on the report card and in every marks-entry grid for the class.
 * Core subjects are compulsory for every student; subsidiaries are opt-in per
 * student (see isEnrolledIn).
 */
export function classSubjectsFor(classId: string): ClassSubject[] {
  const cached = classSubjectsCache.get(classId);
  if (cached) return cached;
  const list: ClassSubject[] = subjects.map((sub, i) => ({
    subjectId: sub.id,
    classId,
    type: SUBSIDIARY_SUBJECT_IDS.has(sub.id) ? "subsidiary" : "core",
    chartLabel: sub.code,
    teacherId:
      subjectTeacherOf(sub.id, classId)?.id ??
      classById(classId)?.classTeacherId ??
      teachers[0].id,
    periodsPerWeek: PERIODS_BY_SUBJECT[i % PERIODS_BY_SUBJECT.length],
    examPapers: sub.department === "Sciences" ? 2 : 1,
    // The fixed Josephian assessment split: Monthly CA 25% + Exam 75%.
    caMarks: 25,
    examMarks: 75,
    fullMarks: 100,
  }));
  classSubjectsCache.set(classId, list);
  return list;
}

/** Students eligible to sit this class subject (all for core, enrolled for subsidiary). */
export function eligibleStudentsFor(classId: string, subjectId: string): Student[] {
  return studentsInClass(classId).filter((s) => isEnrolledIn(classId, subjectId, s.id));
}

/* ================================================================
 * Marks deadlines (derived from actual marks for consistency)
 * ================================================================ */

export const marksDeadlines: MarksDeadline[] = classes.flatMap((cls) =>
  subjects.map((sub) => {
    const marks = getMarks(cls.id, sub.id);
    const eligible = eligibleStudentsFor(cls.id, sub.id);
    const done = eligible.filter((s) => marks[s.id] !== null).length;
    const teacher = teachers.find((t) => t.subjectIds.includes(sub.id));
    return {
      id: `${cls.id}-${sub.id}`,
      cycleId: DEMO_IDS.reportCycleId,
      classId: cls.id,
      subjectId: sub.id,
      dueDate: "2026-03-06",
      enteredBy: teacher?.name ?? null,
      submittedAt: done === eligible.length ? "2026-03-04" : null,
      entriesDone: done,
      entriesTotal: eligible.length,
    };
  }),
);

/* ================================================================
 * Comments
 * ================================================================ */

/* ---------------------------------------------------------------
 * Four-sentence remark generator (school convention).
 *
 * The class teacher's remark is a full paragraph of exactly four
 * sentences: (1) band-aware opening quoting the term average and
 * class rank, (2) the strongest subject with its mark, (3) an
 * unassessed-subject note or the weakest-subject focus area, and
 * (4) a closing recommendation for the next term. The parental
 * involvement note is likewise four sentences drawn from home
 * support pools. All picks come from seeded PRNGs so every render
 * shows the same paragraph for the same student.
 * --------------------------------------------------------------- */

/** Band-keyed opening / focus / closing sentence pools (A–E scale). */
const CLASS_TEACHER_POOLS: Record<
  string,
  { open: string[]; focus: string[]; close: string[] }
> = {
  A: {
    open: [
      "{name} closes the term on an outstanding average of {avg}, ranked {rank} of {size} in {class}.",
      "An excellent term for {name}: {avg} overall and position {rank} of {size} in {class}.",
      "{name} has sustained an outstanding standard this term, finishing on {avg} at position {rank} of {size} in {class}.",
    ],
    focus: [
      "Even at this level, {subject} ({mark}) offers room to push for full marks.",
      "The closest gap to perfection is in {subject} ({mark}); steady revision will close it.",
      "Attention to {subject} ({mark}) would make a strong record exceptional.",
    ],
    close: [
      "Maintain this discipline and aim even higher next term.",
      "Keep up the outstanding work; the sky is the limit.",
      "This is excellent work — sustain the momentum into the new term.",
    ],
  },
  B: {
    open: [
      "{name} finishes the term with a very good average of {avg}, ranked {rank} of {size} in {class}.",
      "A very good term for {name}: {avg} overall at position {rank} of {size} in {class}.",
      "{name} has worked steadily to a very good standard, closing on {avg} and rank {rank} of {size} in {class}.",
    ],
    focus: [
      "{subject} ({mark}) is the one area holding the average back; targeted revision will lift it.",
      "Extra practice in {subject} ({mark}) is the surest route to the A band.",
      "A little more consistency in {subject} ({mark}) would move the whole result up.",
    ],
    close: [
      "With sustained effort, top grades are well within reach next term.",
      "Keep pushing — a small lift in the weaker area earns a higher grade.",
      "Very good work overall; convert it to excellence with regular revision.",
    ],
  },
  C: {
    open: [
      "{name} ends the term with a good average of {avg}, ranked {rank} of {size} in {class}.",
      "A fair term's work from {name}: {avg} overall, position {rank} of {size} in {class}.",
      "{name} has achieved a good pass standard this term, averaging {avg} at rank {rank} of {size} in {class}.",
    ],
    focus: [
      "{subject} ({mark}) drags the average down; a revision timetable should start there.",
      "More consistent effort is needed in {subject} ({mark}) to raise the overall grade.",
      "Extra attention to {subject} ({mark}) would lift {name} into the B band.",
    ],
    close: [
      "Good effort; revise weaker areas and results will improve.",
      "There is clear potential here — more consistent revision will show it.",
      "Aim higher next term by revising the weak subjects early.",
    ],
  },
  D: {
    open: [
      "{name} finishes with a satisfactory average of {avg}, ranked {rank} of {size} in {class}, but is capable of more.",
      "A satisfactory but modest term for {name}: {avg} overall, position {rank} of {size} in {class}.",
      "{name} passed the term at a satisfactory level, averaging {avg} and ranking {rank} of {size} in {class}.",
    ],
    focus: [
      "{subject} ({mark}) needs urgent attention; remedial practice at home and school is advised.",
      "Serious catch-up work is required in {subject} ({mark}) before the next assessment.",
      "The mark in {subject} ({mark}) shows the gap to close first.",
    ],
    close: [
      "Greater commitment to studies next term is strongly encouraged.",
      "Attendance at remedial sessions and daily revision should be the plan.",
      "We expect a marked improvement next term with steady effort.",
    ],
  },
  E: {
    open: [
      "{name} finishes with an average of {avg}, ranked {rank} of {size} in {class}; this is below the expected standard.",
      "A difficult term for {name}: {avg} overall, position {rank} of {size} in {class}.",
      "{name} struggled this term, averaging {avg} and ranking {rank} of {size} in {class}.",
    ],
    focus: [
      "{subject} ({mark}) and the other low papers need to be re-taught and re-practised from the basics.",
      "Foundation work must begin with {subject} ({mark}) and the other weak areas.",
      "Rebuilding the basics of {subject} ({mark}) is the immediate priority.",
    ],
    close: [
      "Immediate and sustained support is needed; we will work with the home on a recovery plan.",
      "A fresh start next term with daily supervised revision is essential.",
      "We urge a joint home–school plan to rebuild the basics.",
    ],
  },
};

/** Sentence 2: celebrates the strongest subject with its mark. */
const STRONGEST_SENTENCES: string[] = [
  "{subject} is the standout at {mark}; keep stretching that strength.",
  "The best paper was {subject} at {mark} — real talent showing there.",
  "Particular strength in {subject} ({mark}); well done.",
  "{subject} ({mark}) led all subjects and deserves praise.",
  "A fine result in {subject} ({mark}) shows what focused effort achieves.",
];

/** Sentence 3 variant when a subject has no mark recorded yet. */
const NO_MARK_OBSERVATIONS: string[] = [
  "{subject} is not yet assessed, so the average may still shift once the mark is entered.",
  "No mark was recorded for {subject}; the picture will be complete once it is.",
  "{subject} remains unassessed — the final result will firm up when the mark comes in.",
];

/** Sentence 3 fallback when every subject carries a mark and the weakest
    subject is the same one as the strongest (single-subject edge). */
const GENERIC_FOCUS_SENTENCES: string[] = [
  "A balanced revision timetable across all subjects will consolidate this result.",
  "Steady daily revision in every subject is the next step.",
  "Consistent homework completion will keep the average moving up.",
];

/** Four-sentence parental involvement pools: opening, home support,
    follow-up on weak areas, and partnership closing. */
const PARENTAL_OPEN: string[] = [
  "Parents attended both PTA meetings this term and reviewed the progress report with the class teacher.",
  "Communication with home has been open and prompt throughout the term.",
  "The guardian responds quickly to teacher calls and attends every consultation session.",
  "Parents visited the school twice this term to review progress.",
];

const PARENTAL_HOME: string[] = [
  "Home revision is supervised daily and the homework diary is signed every week.",
  "A quiet study hour is enforced at home, and the reading log is returned signed.",
  "The family keeps a fixed evening study routine with no interruptions.",
  "The guardian reviews assignments each evening and follows up on corrections.",
];

const PARENTAL_FOLLOWUP: string[] = [
  "The home has been asked to give extra practice in the weaker subjects and has agreed to a revision timetable.",
  "Weak areas flagged at mid-term are being addressed with extra worksheets at home.",
  "The guardian has arranged weekend practice in the subjects that trailed.",
  "The family has committed to closer follow-up of homework in the weak subjects.",
];

const PARENTAL_CLOSING: string[] = [
  "The school and home remain firmly aligned on the improvement plan.",
  "We thank the family for its continued partnership in the child's education.",
  "This level of home support makes a real difference; please keep it up.",
  "Together, school and home will keep the student on track next term.",
];

const COMMENTS_MISSING = new Set(["f1a-02", "f1a-06", "f1a-08", "f1a-11", "f1b-03"]);
const COMMENTS_DRAFT = new Set(["f3a-04", "f3a-09", "cls-2a|f2a-05"]);

function fill(t: string, v: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "");
}

const pick = <T,>(xs: readonly T[], rnd: () => number): T =>
  xs[Math.floor(rnd() * xs.length)];

export function commentFor(classId: string, studentId: string): CommentRecord {
  // Two seeded PRNGs: one for the teacher's paragraph, one for the
  // parental paragraph, so the picks stay independent but stable.
  const ctRnd = mulberry32(hashStr(`comment|ct|${classId}|${studentId}`));
  const piRnd = mulberry32(hashStr(`comment|pi|${classId}|${studentId}`));
  const missing = COMMENTS_MISSING.has(studentId);
  const draft = COMMENTS_DRAFT.has(studentId);
  const updatedAt = `2026-03-0${1 + Math.floor(ctRnd() * 8)}`;

  if (missing) {
    return { studentId, classTeacher: null, parentalInvolvement: null, status: "draft", updatedAt };
  }

  const student = studentById(studentId);
  const name = student?.name.split(" ")[0] ?? "The student";
  const className = classById(classId)?.name ?? "class";

  /* ---- Parental involvement: one sentence from each pool ---- */
  const parentalInvolvement = [
    pick(PARENTAL_OPEN, piRnd),
    pick(PARENTAL_HOME, piRnd),
    pick(PARENTAL_FOLLOWUP, piRnd),
    pick(PARENTAL_CLOSING, piRnd),
  ].join(" ");

  /* ---- Class teacher's remark: 4 sentences ---- */
  const result = studentResultOf(studentId);
  if (!result || result.count === 0) {
    // No marks recorded: keep four sentences, but quote nothing.
    const unmarked = result
      ? Object.entries(result.marks).find(([, m]) => m === null)?.[0]
      : undefined;
    const subj = unmarked
      ? (subjects.find((s) => s.id === unmarked)?.name ?? "One subject")
      : "Most subjects";
    const ct = [
      `${name}'s record is not yet complete for this term; marks are still being entered.`,
      fill(pick(NO_MARK_OBSERVATIONS, ctRnd), { subject: subj }),
      "Once all papers are marked, the average and class position will be finalised.",
      "We encourage steady revision at home in the meantime.",
    ].join(" ");
    return { studentId, classTeacher: ct, parentalInvolvement, status: draft ? "draft" : "submitted", updatedAt };
  }

  const size = classResults(classId).length;
  // Secondary scheme grades failing students "F" (primary uses "E"); the
  // pools are keyed A–E, so map F onto the E ("can do better") tone.
  const band = CLASS_TEACHER_POOLS[result.grade]
    ? result.grade
    : result.grade === "F"
      ? "E"
      : "C";
  const vars = {
    name,
    avg: result.average.toFixed(2),
    rank: String(result.rank),
    size: String(size),
    class: className,
  };

  // Strongest and weakest assessed subjects (marks map → catalogue names).
  let strongId: string | undefined;
  let strongMark = -1;
  let weakId: string | undefined;
  let weakMark = 101;
  let noMarkId: string | undefined;
  for (const [sid, m] of Object.entries(result.marks)) {
    if (m === null) {
      noMarkId ??= sid;
    } else if (m > strongMark) {
      strongMark = m;
      strongId = sid;
    }
    if (m !== null && m < weakMark) {
      weakMark = m;
      weakId = sid;
    }
  }
  const subjName = (sid?: string) =>
    sid ? (subjects.find((s) => s.id === sid)?.name ?? "one subject") : "one subject";

  const sentence2 = fill(pick(STRONGEST_SENTENCES, ctRnd), {
    subject: subjName(strongId),
    mark: strongMark.toFixed(2),
  });
  const sentence3 = noMarkId
    ? fill(pick(NO_MARK_OBSERVATIONS, ctRnd), { subject: subjName(noMarkId) })
    : weakId && weakId !== strongId
      ? fill(pick(CLASS_TEACHER_POOLS[band].focus, ctRnd), {
          ...vars,
          subject: subjName(weakId),
          mark: weakMark.toFixed(2),
        })
      : pick(GENERIC_FOCUS_SENTENCES, ctRnd);

  const classTeacher = [
    fill(pick(CLASS_TEACHER_POOLS[band].open, ctRnd), vars),
    sentence2,
    sentence3,
    pick(CLASS_TEACHER_POOLS[band].close, ctRnd),
  ].join(" ");

  return {
    studentId,
    classTeacher,
    parentalInvolvement,
    status: draft ? "draft" : "submitted",
    updatedAt,
  };
}

/**
 * A comment record is complete only when BOTH required parts are present:
 * the class teacher's remark and the parental involvement note.
 */
export function commentProgress(classId: string): {
  done: number;
  total: number;
} {
  const list = studentsInClass(classId);
  const done = list.filter((s) => {
    const c = commentFor(classId, s.id);
    return c.classTeacher !== null && c.parentalInvolvement !== null;
  }).length;
  return { done, total: list.length };
}

/* ================================================================
 * Review & approval
 * ================================================================ */

const APPROVAL_STATES: Record<string, ClassApproval["status"]> = {
  "cls-1a": "approved",
  "cls-1b": "submitted",
  "cls-2a": "changes-requested",
  [DEMO_IDS.classId]: "submitted",
  "cls-3b": "not-submitted",
  "cls-4a": "not-submitted",
};

export const approvals: ClassApproval[] = classes.map((cls) => {
  const status = APPROVAL_STATES[cls.id] ?? "not-submitted";
  const audit: ClassApproval["audit"] = [];
  if (status !== "not-submitted") {
    audit.push({
      at: "2026-03-09 14:20",
      actor: teacherById(cls.classTeacherId)?.name ?? "Class teacher",
      action: "Marks and comments submitted for review",
    });
  }
  if (status === "changes-requested") {
    audit.push({
      at: "2026-03-10 09:05",
      actor: ACADEMIC_APPROVER,
      action: "Changes requested",
      detail: "Mathematics marks for 3 students look inconsistent with coursework. Please verify.",
    });
  }
  if (status === "approved") {
    audit.push({
      at: "2026-03-10 11:40",
      actor: ACADEMIC_APPROVER,
      action: "Approved for report generation",
    });
  }
  return {
    classId: cls.id,
    status,
    submittedAt: status === "not-submitted" ? null : "2026-03-09",
    submittedBy: teacherById(cls.classTeacherId)?.name ?? null,
    reviewedAt: status === "approved" ? "2026-03-10" : status === "changes-requested" ? "2026-03-10" : null,
    reviewedBy: status === "approved" || status === "changes-requested" ? ACADEMIC_APPROVER : null,
    note:
      status === "changes-requested"
        ? "Mathematics marks for 3 students look inconsistent with coursework. Please verify."
        : null,
    audit,
  };
});

export const approvalFor = (classId: string): ClassApproval =>
  approvals.find((a) => a.classId === classId) ?? {
    classId,
    status: "not-submitted",
    submittedAt: null,
    submittedBy: null,
    reviewedAt: null,
    reviewedBy: null,
    note: null,
    audit: [],
  };

/* ================================================================
 * Batch generation history
 * ================================================================ */

export const batchRuns: BatchRun[] = [
  {
    id: "batch-003",
    createdAt: "2025-11-24 10:32",
    scopeLabel: "Form 4A · Term 3 2025",
    classes: ["cls-4a"],
    status: "completed",
    generated: 12,
    failed: [],
    startedBy: ACADEMIC_APPROVER,
  },
  {
    id: "batch-002",
    createdAt: "2026-01-20 15:08",
    scopeLabel: "Form 1A + Form 1B · Term 1 2026 (draft run)",
    classes: ["cls-1a", "cls-1b"],
    status: "partial",
    generated: 22,
    failed: [{ classId: "cls-1b", reason: "3 class-teacher comments missing" }],
    startedBy: ACADEMIC_APPROVER,
  },
];

/* ================================================================
 * Release management
 * ================================================================ */

export const releases: ClassRelease[] = [
  {
    classId: "cls-1a",
    releasedAt: "2026-01-24 08:00",
    releasedBy: ACADEMIC_APPROVER,
    hold: null,
  },
  {
    classId: "cls-1b",
    releasedAt: null,
    releasedBy: null,
    hold: { reason: "Fees balance", detail: "3 students have an outstanding balance. Cards held until cleared." },
  },
  {
    classId: "cls-2a",
    releasedAt: null,
    releasedBy: null,
    hold: null,
  },
  {
    classId: DEMO_IDS.classId,
    releasedAt: null,
    releasedBy: null,
    hold: null,
  },
  {
    classId: "cls-3b",
    releasedAt: null,
    releasedBy: null,
    hold: null,
  },
  {
    classId: "cls-4a",
    releasedAt: null,
    releasedBy: null,
    hold: { reason: "Approval pending", detail: "Class has not completed marks entry for Chemistry." },
  },
];

export const releaseFor = (classId: string): ClassRelease =>
  releases.find((r) => r.classId === classId) ?? {
    classId,
    releasedAt: null,
    releasedBy: null,
    hold: null,
  };

/* ================================================================
 * Parents' day
 * ================================================================ */

export const parentsDayEvent = {
  date: "2026-03-27",
  window: "09:00-12:40",
  slots: ["09:00", "09:20", "09:40", "10:00", "10:20", "10:40", "11:00", "11:20", "11:40", "12:00"],
};

/** Slots for the six class teachers (deterministic bookings). */
export const bookingSlots: BookingSlot[] = (() => {
  const list: BookingSlot[] = [];
  classes.forEach((cls, ti) => {
    const teacherId = cls.classTeacherId;
    parentsDayEvent.slots.forEach((slot, si) => {
      const seed = hashStr(`${teacherId}|${slot}`);
      const booked = seed % 10 < 6;
      const studentPool = studentsInClass(cls.id);
      const pick = studentPool[seed % studentPool.length];
      list.push({
        id: `${teacherId}-${si}`,
        teacherId,
        slot: slotLabel(slot),
        bookedByStudentId: booked ? pick.id : null,
      });
    });
  });
  return list;
})();

export function slotLabel(slot: string): string {
  const [h, m] = slot.split(":").map(Number);
  const end = m + 20;
  const eh = end >= 60 ? h + 1 : h;
  const em = end % 60;
  return `${slot}: ${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

/* ================================================================
 * Next-term targets
 * ================================================================ */

const FOCUS_AREAS = [
  "Algebra and equations",
  "Essay structure",
  "Comprehension speed",
  "Lab reporting",
  "Map work",
  "Past-paper practice",
  "Time management",
  "Memorisation techniques",
];

export function targetFor(studentId: string): StudentTarget {
  const result = studentResultOf(studentId);
  const rnd = mulberry32(hashStr(`target|${studentId}`));
  const base = result && result.count > 0 ? result.average : 55;
  return {
    studentId,
    targetAverage: Math.min(97, Math.round(base + 5 + rnd() * 6)),
    focus: FOCUS_AREAS[Math.floor(rnd() * FOCUS_AREAS.length)],
  };
}

/* ================================================================
 * Derived results (used by results, report card, dashboards)
 * ================================================================ */

export interface StudentResult {
  student: Student;
  marks: Record<string, number | null>;
  total: number;
  count: number;
  average: number;
  grade: string;
  rank: number;
  /** Sum of the best 7 subject points; null when fewer than 7 graded. */
  bestSevenPoints: number | null;
  /** NECTA division from the best 7 subject points; null when < 7 graded. */
  division: DivisionResult | null;
  /** Subjects whose grade letter is not E or F. */
  passedCount: number;
}

const classResultsCache = new Map<string, StudentResult[]>();

export function classResults(classId: string): StudentResult[] {
  const cached = classResultsCache.get(classId);
  if (cached) return cached;
  const scheme = schemeForClass(classId);
  // Divisions are a secondary (NECTA CSEE) outcome — never computed for primary.
  const allowDivision = !isPrimaryClass(classId);
  const rows = studentsInClass(classId).map((student) => {
    const marks: Record<string, number | null> = {};
    const points: (number | null)[] = [];
    const grades: (string | null)[] = [];
    let total = 0;
    let count = 0;
    for (const sub of subjects) {
      const m = getMarks(classId, sub.id)[student.id];
      marks[sub.id] = m;
      if (m !== null) {
        total += m;
        count += 1;
        const g = gradeFor(m, scheme);
        grades.push(g?.grade ?? null);
        points.push(g?.points ?? null);
      } else {
        grades.push(null);
        points.push(null);
      }
    }
    const average = count > 0 ? total / count : 0;
    const division = allowDivision ? divisionFor(points) : null;
    return {
      student,
      marks,
      total,
      count,
      average,
      grade: count > 0 ? gradeFor(average, scheme)?.grade ?? scheme.boundaries[scheme.boundaries.length - 1].grade : "-",
      rank: 0,
      bestSevenPoints: division?.pointsSum ?? null,
      division,
      passedCount: subjectsPassed(grades),
    };
  });
  rows.sort((a, b) => b.average - a.average);
  rows.forEach((r, i) => (r.rank = i + 1));
  classResultsCache.set(classId, rows);
  return rows;
}

export function studentResultOf(studentId: string): StudentResult | undefined {
  const student = studentById(studentId);
  if (!student) return undefined;
  return classResults(student.classId).find((r) => r.student.id === studentId);
}

/**
 * Per-subject class statistics, in CLASS-SUBJECT order (the order set on the
 * Class subjects page — not the catalogue order) and graded with the class's
 * own scheme. Marks not entered are doubly excluded from every average.
 */
export function subjectAveragesFor(classId: string): {
  subjectId: string;
  avg: number;
  passRate: number;
  highest: number;
  lowest: number;
  distribution: Record<string, number>;
}[] {
  const scheme = schemeForClass(classId);
  return classSubjectsFor(classId).map((cs) => {
    const marks = Object.values(getMarks(classId, cs.subjectId)).filter(
      (v): v is number => v !== null,
    );
    const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
    const distribution: Record<string, number> = {};
    for (const b of scheme.boundaries) distribution[b.grade] = 0;
    for (const m of marks) {
      const g = gradeFor(m, scheme)?.grade;
      if (g) distribution[g] += 1;
    }
    return {
      subjectId: cs.subjectId,
      avg,
      passRate: marks.length ? Math.round((marks.filter((m) => m >= scheme.passMark).length / marks.length) * 100) : 0,
      highest: marks.length ? Math.max(...marks) : 0,
      lowest: marks.length ? Math.min(...marks) : 0,
      distribution,
    };
  });
}

export interface CycleStats {
  totalStudents: number;
  average: number;
  passRate: number;
  gradeDistribution: Record<string, number>;
  classAverages: { classId: string; name: string; avg: number }[];
  subjectAverages: { subjectId: string; name: string; department: string; avg: number; passRate: number }[];
  marksCompletion: number;
  commentsCompletion: number;
  topStudents: { name: string; className: string; avg: number }[];
}

const cycleStatsCache = new Map<string, CycleStats>();

export function cycleStatsFor(cycleId: string): CycleStats {
  const cached = cycleStatsCache.get(cycleId);
  if (cached) return cached;
  const all = classes.flatMap((c) => classResults(c.id));
  const allMarks = all.flatMap((r) => Object.values(r.marks).filter((v): v is number => v !== null));
  const average = allMarks.length ? allMarks.reduce((a, b) => a + b, 0) / allMarks.length : 0;
  // Grade each class's marks with THAT class's scheme (primary A-E vs NECTA
  // CSEE A-F) so the school-wide distribution never mis-files a primary mark.
  const gradeDistribution: Record<string, number> = {};
  for (const s of gradingSchemes) for (const b of s.boundaries) gradeDistribution[b.grade] = 0;
  let passedEntries = 0;
  for (const c of classes) {
    const scheme = schemeForClass(c.id);
    for (const r of classResults(c.id)) {
      for (const m of Object.values(r.marks)) {
        if (m === null) continue;
        const g = gradeFor(m, scheme)?.grade;
        if (g) gradeDistribution[g] = (gradeDistribution[g] ?? 0) + 1;
        if (m >= scheme.passMark) passedEntries += 1;
      }
    }
  }
  const totalEntries = marksDeadlines.reduce((a, d) => a + d.entriesTotal, 0);
  const doneEntries = marksDeadlines.reduce((a, d) => a + d.entriesDone, 0);
  const commentTotals = classes.reduce(
    (acc, c) => {
      const p = commentProgress(c.id);
      return { done: acc.done + p.done, total: acc.total + p.total };
    },
    { done: 0, total: 0 },
  );
  const stats: CycleStats = {
    totalStudents: all.length,
    average,
    passRate: allMarks.length ? Math.round((passedEntries / allMarks.length) * 100) : 0,
    gradeDistribution,
    classAverages: classes.map((c) => ({
      classId: c.id,
      name: c.name,
      avg: classResults(c.id).reduce((a, r) => a + r.average, 0) / classResults(c.id).length,
    })),
    subjectAverages: subjects.map((sub) => {
      let entered = 0;
      let passed = 0;
      let sum = 0;
      for (const c of classes) {
        const scheme = schemeForClass(c.id);
        for (const m of Object.values(getMarks(c.id, sub.id))) {
          if (m === null) continue;
          entered += 1;
          sum += m;
          if (m >= scheme.passMark) passed += 1;
        }
      }
      return {
        subjectId: sub.id,
        name: sub.name,
        department: sub.department,
        avg: entered ? sum / entered : 0,
        passRate: entered ? Math.round((passed / entered) * 100) : 0,
      };
    }),
    marksCompletion: totalEntries ? Math.round((doneEntries / totalEntries) * 100) : 0,
    commentsCompletion: commentTotals.total ? Math.round((commentTotals.done / commentTotals.total) * 100) : 0,
    topStudents: all
      .slice()
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
      .map((r) => ({ name: r.student.name, className: classNameOf(r.student.classId), avg: r.average })),
  };
  cycleStatsCache.set(cycleId, stats);
  return stats;
}

export interface DepartmentStat {
  department: string;
  hodName: string;
  avg: number;
  passRate: number;
  submissionRate: number;
  subjects: { subjectId: string; name: string; avg: number; passRate: number }[];
  teachers: { name: string; subject: string; done: number; total: number }[];
}

export function departmentStats(): DepartmentStat[] {
  const deptNames = [...new Set(subjects.map((s) => s.department))];
  return deptNames.map((dept) => {
    const deptSubjects = subjects.filter((s) => s.department === dept);
    const rows = deptSubjects.map((sub) => {
      // Pass rate is judged against each class's own scheme pass mark.
      let entered = 0;
      let passed = 0;
      let sum = 0;
      for (const c of classes) {
        const scheme = schemeForClass(c.id);
        for (const m of Object.values(getMarks(c.id, sub.id))) {
          if (m === null) continue;
          entered += 1;
          sum += m;
          if (m >= scheme.passMark) passed += 1;
        }
      }
      return {
        subjectId: sub.id,
        name: sub.name,
        avg: entered ? sum / entered : 0,
        passRate: entered ? Math.round((passed / entered) * 100) : 0,
      };
    });
    const teacherRows = deptSubjects.flatMap((sub) => {
      const t = teachers.find((t) => t.subjectIds.includes(sub.id));
      if (!t) return [];
      const rel = marksDeadlines.filter((d) => d.subjectId === sub.id);
      const done = rel.reduce((a, d) => a + d.entriesDone, 0);
      const total = rel.reduce((a, d) => a + d.entriesTotal, 0);
      return [{ name: t.name, subject: sub.name, done, total }];
    });
    const submissionTotal = teacherRows.reduce((a, r) => a + r.total, 0);
    const submissionDone = teacherRows.reduce((a, r) => a + r.done, 0);
    const hod = teachers.find((t) => t.role.includes(`HOD ${dept}`));
    return {
      department: dept,
      hodName: hod?.name ?? "-",
      avg: rows.reduce((a, r) => a + r.avg, 0) / rows.length,
      passRate: Math.round(rows.reduce((a, r) => a + r.passRate, 0) / rows.length),
      submissionRate: submissionTotal ? Math.round((submissionDone / submissionTotal) * 100) : 0,
      subjects: rows,
      teachers: teacherRows,
    };
  });
}

/* ================================================================
 * Report-card extras
 * ================================================================ */

/* ----------------------------------------------------------------
 * Attendance (A3.8) — demo daily-register aggregation
 * ---------------------------------------------------------------- */

const attendanceCache = new Map<string, AttendanceSummary>();

/** Pinned flagship register so the demo card shows every A3.8 row. */
const ATTENDANCE_PINNED: Record<
  string,
  { late: number; absent: number; excused: number; notRecorded: number }
> = {
  [DEMO_IDS.studentId]: { late: 2, absent: 2, excused: 1, notRecorded: 1 },
};

/**
 * Per-student attendance summary for the current demo cycle, aggregated from
 * a deterministic fake daily roll call over the cycle's attendance period
 * (A3.8): counted marks only; late counts as attended; excused stays in the
 * denominator; possible days with no counted mark are reported separately
 * and are never counted as absent. A real integration queries by person
 * (not section) so a mid-term stream transfer still counts.
 */
export function attendanceRecordFor(studentId: string): AttendanceSummary {
  const cached = attendanceCache.get(studentId);
  if (cached) return cached;
  const cycle = currentCycle;
  const possible = possibleSchoolDays(cycle.attendanceFrom, cycle.attendanceTo);
  const rnd = mulberry32(hashStr(`attend|${studentId}`));
  const pinned = ATTENDANCE_PINNED[studentId] ?? {
    late: Math.floor(rnd() * 4), // 0-3 late arrivals
    absent: Math.floor(rnd() * 4), // 0-3 unexcused absences
    excused: Math.floor(rnd() * 3), // 0-2 excused
    notRecorded: Math.floor(rnd() * 3), // 0-2 days with no counted register
  };
  const recorded = possible - pinned.notRecorded;
  const attended = recorded - pinned.absent - pinned.excused;
  const present = Math.max(0, attended - pinned.late);
  // One entry per possible school day, in calendar order — the aggregator
  // only counts, so a stable placement keeps the demo deterministic.
  const marks: (AttendanceStatus | null)[] = [
    ...Array<AttendanceStatus>(present).fill("present"),
    ...Array<AttendanceStatus>(pinned.late).fill("late"),
    ...Array<AttendanceStatus>(pinned.absent).fill("absent"),
    ...Array<AttendanceStatus>(pinned.excused).fill("excused"),
    ...Array<AttendanceStatus | null>(pinned.notRecorded).fill(null),
  ];
  const summary = computeAttendanceSummary({
    from: cycle.attendanceFrom,
    to: cycle.attendanceTo,
    possibleSchoolDays: possible,
    marks,
  });
  attendanceCache.set(studentId, summary);
  return summary;
}

/**
 * Attendance readiness facts per class (fake catch-up register state, B1.6):
 * school days with no counted register in the period, and catch-up
 * ("backfill") registers awaiting approval. A pending or declined catch-up
 * register must not count towards attendance (A3.8).
 */
export function attendanceReadinessFor(classId: string): {
  missingRegisterDays: number;
  pendingCatchUpRegisters: number;
} {
  const gaps: Record<string, { missingRegisterDays: number; pendingCatchUpRegisters: number }> = {
    "cls-2a": { missingRegisterDays: 3, pendingCatchUpRegisters: 1 },
    "cls-4a": { missingRegisterDays: 1, pendingCatchUpRegisters: 0 },
  };
  return gaps[classId] ?? { missingRegisterDays: 0, pendingCatchUpRegisters: 0 };
}

export function studentEffort(studentId: string, subjectId: string): string {
  const rnd = mulberry32(hashStr(`effort|${studentId}|${subjectId}`));
  return ["A", "A", "B", "B", "C"][Math.floor(rnd() * 5)];
}

/* ---------------------------------------------------------------
 * Three-sentence subject comment (school convention).
 *
 * Every assessed subject on Terminal/Annual cards carries a short
 * personalised paragraph of exactly three sentences: (1) a band-aware
 * opening naming the student, subject and total mark, (2) a CA vs
 * exam comparison from the recorded components (falls back to a
 * steady-effort line when a component is missing), and (3) a
 * band-aware action for next term. Picks come from a seeded PRNG so
 * the same student × subject always shows the same paragraph.
 * --------------------------------------------------------------- */

export interface SubjectCommentOpts {
  /** Monthly/CA component as a percentage (0–100), as stored by getComponents. */
  ca?: number | null;
  /** Exam component as a percentage (0–100), as stored by getComponents. */
  exam?: number | null;
}

const SUBJECT_OPEN_POOLS: Record<string, string[]> = {
  A: [
    "{name} shows excellent command of {subject}, finishing the term at {mark}.",
    "{name} produced an outstanding {subject} result at {mark}; the topic is fully understood.",
    "{subject} was handled with confidence by {name} all term, closing at {mark}.",
  ],
  B: [
    "{name} performs very well in {subject}, finishing at {mark}.",
    "{name} has a very good grasp of {subject}, ending the term at {mark}.",
    "{name} worked consistently in {subject} and closed at {mark}.",
  ],
  C: [
    "{name} shows a good understanding of {subject}, reaching {mark}.",
    "{name} achieved a fair result in {subject} at {mark}; the basics are in place.",
    "{name} passed {subject} comfortably at {mark}.",
  ],
  D: [
    "{name} achieves a satisfactory result in {subject} at {mark}.",
    "{name} closed {subject} at {mark}, a modest but passing result.",
    "{name} met the minimum standard in {subject} ({mark}).",
  ],
  E: [
    "{name} finds {subject} difficult, finishing at {mark}.",
    "{name} recorded a low result in {subject} ({mark}); the fundamentals need rebuilding.",
    "{subject} closed at {mark}, well below {name}'s capability.",
  ],
};

const SUBJECT_EXAM_STRONGER: string[] = [
  "The exam ({examPct}%) was stronger than the CA ({caPct}%), showing good exam temperament.",
  "Performance peaked in the exam ({examPct}%) against a CA of {caPct}%; carry that form into coursework too.",
];

const SUBJECT_CA_STRONGER: string[] = [
  "Coursework led the way — CA {caPct}% against an exam of {examPct}%; exam technique needs polishing.",
  "The CA ({caPct}%) outshone the exam ({examPct}%); more past-paper practice will close the gap.",
];

const SUBJECT_BALANCED: string[] = [
  "CA ({caPct}%) and exam ({examPct}%) were well matched through the term.",
  "Both assessments agreed — CA {caPct}%, exam {examPct}% — a steady, consistent effort.",
];

const SUBJECT_COMPONENT_MISSING: string[] = [
  "Performance stayed consistent across the term's assessments.",
  "The term's work was steady from start to finish.",
];

const SUBJECT_ACTION_POOLS: Record<string, string[]> = {
  A: [
    "Maintain this excellent standard in {subject} next term.",
    "Keep challenging yourself with extension work in {subject}.",
  ],
  B: [
    "A little more revision will push {subject} into the A band.",
    "Keep practising {subject} past papers to secure the top band.",
  ],
  C: [
    "Regular revision of {subject} notes will lift this grade further.",
    "Set a weekly target in {subject} to move into the B band.",
  ],
  D: [
    "Attend remedial sessions in {subject} and complete all assignments.",
    "More consistent homework in {subject} is needed to raise this grade.",
  ],
  E: [
    "A recovery plan with daily supervised practice in {subject} is essential.",
    "Rebuild the {subject} fundamentals with teacher and home support.",
  ],
};

export function subjectComment(
  studentId: string,
  subjectId: string,
  mark: number,
  scheme: GradingScheme = defaultScheme,
  opts: SubjectCommentOpts = {},
): string {
  const rnd = mulberry32(hashStr(`subjectComment|${studentId}|${subjectId}`));
  const name = studentById(studentId)?.name.split(" ")[0] ?? "The student";
  const subject = subjectById(subjectId)?.name ?? "this subject";
  const g = gradeFor(mark, scheme)?.grade ?? "C";
  // Secondary grades failures "F", primary "E" — both share the E-tone pools.
  const band = SUBJECT_OPEN_POOLS[g] ? g : g === "F" ? "E" : "C";

  const s1 = fill(pick(SUBJECT_OPEN_POOLS[band], rnd), {
    name,
    subject,
    mark: mark.toFixed(2),
  });

  const { ca, exam } = opts;
  let s2: string;
  if (typeof ca === "number" && typeof exam === "number") {
    // getComponents stores both components as percentages (0–100).
    const caPct = Math.round(ca);
    const examPct = Math.round(exam);
    const pool =
      examPct - caPct >= 10
        ? SUBJECT_EXAM_STRONGER
        : caPct - examPct >= 10
          ? SUBJECT_CA_STRONGER
          : SUBJECT_BALANCED;
    s2 = fill(pick(pool, rnd), { caPct: String(caPct), examPct: String(examPct) });
  } else {
    s2 = pick(SUBJECT_COMPONENT_MISSING, rnd);
  }

  const s3 = fill(pick(SUBJECT_ACTION_POOLS[band], rnd), { subject });

  return [s1, s2, s3].join(" ");
}

/**
 * Convenience accessor for the demo parent, consumed by useParentChildren()
 * across the portal. Three children so every template family is visible:
 * the demo student (secondary card), a Form 1B pupil with a fees hold, and
 * a KG2 learner whose card renders the KG2 competency template.
 */
export const demoParent = {
  name: "Mr. Joseph Mwakalinga",
  children: [
    studentById(DEMO_IDS.studentId)!,
    studentById("f1b-04")!,
    studentById("kg2-01")!,
  ],
};
