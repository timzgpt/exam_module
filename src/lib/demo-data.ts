import { DEFAULT_SCHEME_ID, divisionFor, gradeFor, subjectTotal, subjectsPassed } from "./grading";
import { computeAttendanceSummary, possibleSchoolDays } from "./attendance";
import { ACADEMIC_APPROVER, DEMO_IDS } from "./demo-config";
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
 * The 12 real class streams span Primary Grades 1–6 and Secondary Forms 1–2;
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
 * Grading scheme for a class: the Primary A-E bands for Standard classes,
 * the NECTA CSEE bands otherwise. Every grade lookup, distribution and pass
 * rate goes through this so a class is never graded with the wrong bands.
 */
export function schemeForClass(classId: string): GradingScheme {
  return isPrimaryClass(classId) ? schemeById("gs-primary-2026") : defaultScheme;
}

export const classById = (id: string): ClassRoom | undefined =>
  classes.find((c) => c.id === id);

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

export const students: Student[] = buildStudents();

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
 * Primary scheme (Standards 1-6). Points mirror the band scale for editor
 * compatibility only — primary division is never computed from points.
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
  },
  {
    id: "gs-primary-2026",
    name: "Primary Scheme · Standards 1-6 · 2026",
    academicYear: "2026",
    passMark: 21,
    boundaries: primaryBoundaries,
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
    name: "Mid-Term - 2026",
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

export const commentTemplates: string[] = [
  "A diligent and focused student who consistently produces work of a high standard. Keep it up.",
  "Shows steady improvement this term. With more consistent revision, results will improve further.",
  "An active participant in class discussions. Encourage more practice in written exercises at home.",
  "A cheerful member of the class who works well with others. Aim for a higher standard in assignments.",
  "Capable of excellent results. Needs to submit homework on time and revise regularly.",
  "Very strong in practical work. Continue building confidence in theory sections.",
  "Excellent attendance and attitude. A role model to peers. Very proud of this term's effort.",
  "Should make greater use of the library and attempt more past examination papers.",
];

/**
 * Parental involvement is a REQUIRED part of every comment record, so the
 * demo generator always provides a note for every non-missing student.
 */
const parentalInvolvementNotes: string[] = [
  "Parents attend all consultation sessions and review homework daily.",
  "Guardian communicates regularly with the class teacher and follows up on assignments.",
  "Strong home support; the reading log is signed and returned every week.",
  "Parent visits the school each month and supports the study plan at home.",
  "Guardian responds promptly to teacher calls and monitors revision closely.",
  "Parents attended both PTA meetings this term and support home revision.",
  "Grandparent is the primary guardian and supervises study time consistently.",
  "Home follow-up is consistent; parents volunteer in class activities.",
];

const COMMENTS_MISSING = new Set(["f1a-02", "f1a-06", "f1a-08", "f1a-11", "f1b-03"]);
const COMMENTS_DRAFT = new Set(["f3a-04", "f3a-09", "cls-2a|f2a-05"]);

export function commentFor(classId: string, studentId: string): CommentRecord {
  const rnd = mulberry32(hashStr(`comment|${classId}|${studentId}`));
  const missing = COMMENTS_MISSING.has(studentId);
  const draft = COMMENTS_DRAFT.has(studentId);
  const idx = Math.floor(rnd() * commentTemplates.length);
  const pIdx = Math.floor(rnd() * parentalInvolvementNotes.length);
  return {
    studentId,
    classTeacher: missing ? null : commentTemplates[idx],
    parentalInvolvement: missing ? null : parentalInvolvementNotes[pIdx],
    status: missing ? "draft" : draft ? "draft" : "submitted",
    updatedAt: `2026-03-0${1 + Math.floor(rnd() * 8)}`,
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

export function subjectRemark(mark: number, scheme: GradingScheme = defaultScheme): string {
  const g = gradeFor(mark, scheme)?.grade ?? scheme.boundaries[scheme.boundaries.length - 1].grade;
  if (g === "A") return "Excellent understanding of the topic.";
  if (g === "B") return "Very good performance. Keep improving.";
  if (g === "C") return "Good effort; revise weaker areas.";
  if (g === "D") return "Satisfactory; needs more practice.";
  if (g === "E") return "Pass; attend remedial sessions.";
  return "Must put in more effort next term.";
}

/**
 * Convenience accessor for the demo parent, consumed by useParentChildren()
 * across the portal. Two children so hold/release states are visible (Form 1B
 * has a fees hold; the demo student's class does not).
 */
export const demoParent = {
  name: "Mr. Joseph Mwakalinga",
  children: [studentById(DEMO_IDS.studentId)!, studentById("f1b-04")!],
};
