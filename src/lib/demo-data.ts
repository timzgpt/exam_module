import { DEFAULT_SCHEME_ID, gradeFor } from "./grading";
import { DEMO_IDS } from "./demo-config";
import type {
  BookingSlot,
  BatchRun,
  ClassApproval,
  ClassRelease,
  ClassRoom,
  CommentRecord,
  Exam,
  GradeBoundary,
  GradingScheme,
  MarksDeadline,
  ReportCycle,
  Student,
  StudentTarget,
  Subject,
  Teacher,
  VerificationRecord,
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

export const classes: ClassRoom[] = [
  { id: "cls-1a", name: "Form 1A", level: "Form 1", classTeacherId: "t3", room: "B2" },
  { id: "cls-1b", name: "Form 1B", level: "Form 1", classTeacherId: "t8", room: "B4" },
  { id: "cls-2a", name: "Form 2A", level: "Form 2", classTeacherId: "t6", room: "B7" },
  { id: DEMO_IDS.classId, name: "Form 3A", level: "Form 3", classTeacherId: "t2", room: "C1" },
  { id: "cls-3b", name: "Form 3B", level: "Form 3", classTeacherId: "t5", room: "C3" },
  { id: "cls-4a", name: "Form 4A", level: "Form 4", classTeacherId: "t1", room: "A5" },
];

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

const boundaries: GradeBoundary[] = [
  { grade: "A", min: 80, max: 100, points: 1, remark: "Excellent" },
  { grade: "B", min: 70, max: 79, points: 2, remark: "Very good" },
  { grade: "C", min: 60, max: 69, points: 3, remark: "Good" },
  { grade: "D", min: 50, max: 59, points: 4, remark: "Satisfactory" },
  { grade: "E", min: 40, max: 49, points: 5, remark: "Pass" },
  { grade: "F", min: 0, max: 39, points: 7, remark: "Fail" },
];

export const gradingSchemes: GradingScheme[] = [
  {
    id: DEFAULT_SCHEME_ID,
    name: "O-Level Scheme · 2026",
    academicYear: "2026",
    passMark: 40,
    boundaries,
  },
  {
    id: "gs-2025",
    name: "O-Level Scheme · 2025",
    academicYear: "2025",
    passMark: 35,
    boundaries: [
      { grade: "A", min: 75, max: 100, points: 1, remark: "Excellent" },
      { grade: "B", min: 65, max: 74, points: 2, remark: "Very good" },
      { grade: "C", min: 45, max: 64, points: 3, remark: "Good" },
      { grade: "D", min: 30, max: 44, points: 4, remark: "Satisfactory" },
      { grade: "F", min: 0, max: 29, points: 7, remark: "Fail" },
    ],
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
    name: "Term 3 · 2025 Report Cycle",
    term: "Term 3",
    academicYear: "2025",
    startDate: "2025-09-08",
    endDate: "2025-11-28",
    status: "released",
    closingDate: "2025-11-21",
    releaseDate: "2025-12-05",
    parentsDayDate: "2025-11-14",
  },
  {
    id: DEMO_IDS.reportCycleId,
    name: "Term 1 · 2026 Report Cycle",
    term: "Term 1",
    academicYear: "2026",
    startDate: "2026-01-12",
    endDate: "2026-04-03",
    status: "review",
    closingDate: "2026-03-13",
    releaseDate: "2026-04-06",
    parentsDayDate: "2026-03-27",
  },
  {
    id: "cy2",
    name: "Term 2 · 2026 Report Cycle",
    term: "Term 2",
    academicYear: "2026",
    startDate: "2026-04-27",
    endDate: "2026-07-17",
    status: "preparation",
    closingDate: "2026-07-10",
    releaseDate: "2026-07-27",
    parentsDayDate: "2026-07-17",
  },
];

export const cycleById = (id: string): ReportCycle | undefined =>
  cycles.find((c) => c.id === id);

export const currentCycle = cycles.find((c) => c.id === DEMO_IDS.reportCycleId)!;

/* ================================================================
 * Marks (seeded, consistent across every page)
 * ================================================================ */

/** Pairs with missing entries so deadline tracker / readiness look real. */
const NULL_PATCHES: Record<string, string[] | "ALL"> = {
  "cls-4a|s5": ["f4a-03", "f4a-07", "f4a-10", "f4a-11"],
  "cls-2a|s7": "ALL",
  "cls-1b|s9": ["f1b-05", "f1b-09"],
};

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
    const ability = 44 + (hashStr(s.id) % 46); // 44-89 latent ability
    const jitter = rnd() * 18 - 9;
    const mark = Math.round(ability + classOffset + subjectOffset + jitter);
    result[s.id] = Math.max(14, Math.min(99, mark));
  }
  const patch = NULL_PATCHES[key];
  if (patch === "ALL") {
    for (const sid of Object.keys(result)) result[sid] = null;
  } else if (patch) {
    for (const sid of patch) result[sid] = null;
  }
  marksCache.set(key, result);
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

/* ================================================================
 * Marks deadlines (derived from actual marks for consistency)
 * ================================================================ */

export const marksDeadlines: MarksDeadline[] = classes.flatMap((cls) =>
  subjects.map((sub) => {
    const marks = getMarks(cls.id, sub.id);
    const values = Object.values(marks);
    const done = values.filter((v): v is number => v !== null).length;
    const teacher = teachers.find((t) => t.subjectIds.includes(sub.id));
    return {
      id: `${cls.id}-${sub.id}`,
      cycleId: DEMO_IDS.reportCycleId,
      classId: cls.id,
      subjectId: sub.id,
      dueDate: "2026-03-06",
      enteredBy: teacher?.name ?? null,
      submittedAt: done === values.length ? "2026-03-04" : null,
      entriesDone: done,
      entriesTotal: values.length,
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

const COMMENTS_MISSING = new Set(["f1a-02", "f1a-06", "f1a-08", "f1a-11", "f1b-03"]);
const COMMENTS_DRAFT = new Set(["f3a-04", "f3a-09", "cls-2a|f2a-05"]);

export function commentFor(classId: string, studentId: string): CommentRecord {
  const rnd = mulberry32(hashStr(`comment|${classId}|${studentId}`));
  const missing = COMMENTS_MISSING.has(studentId);
  const draft = COMMENTS_DRAFT.has(studentId);
  const idx = Math.floor(rnd() * commentTemplates.length);
  const second = Math.floor(rnd() * commentTemplates.length);
  return {
    studentId,
    classTeacher: missing ? null : commentTemplates[idx],
    headTeacher: missing || rnd() > 0.75 ? null : commentTemplates[second],
    status: missing ? "draft" : draft ? "draft" : "submitted",
    updatedAt: `2026-03-0${1 + Math.floor(rnd() * 8)}`,
  };
}

export function commentProgress(classId: string): {
  done: number;
  total: number;
} {
  const list = studentsInClass(classId);
  const done = list.filter(
    (s) => commentFor(classId, s.id).classTeacher !== null,
  ).length;
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
      actor: "Mrs. Agnes Nyoni",
      action: "Changes requested",
      detail: "Mathematics marks for 3 students look inconsistent with coursework. Please verify.",
    });
  }
  if (status === "approved") {
    audit.push({
      at: "2026-03-10 11:40",
      actor: "Mrs. Agnes Nyoni",
      action: "Approved for report generation",
    });
  }
  return {
    classId: cls.id,
    status,
    submittedAt: status === "not-submitted" ? null : "2026-03-09",
    submittedBy: teacherById(cls.classTeacherId)?.name ?? null,
    reviewedAt: status === "approved" ? "2026-03-10" : status === "changes-requested" ? "2026-03-10" : null,
    reviewedBy: status === "approved" || status === "changes-requested" ? "Mrs. Agnes Nyoni" : null,
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
    startedBy: "Mrs. Agnes Nyoni",
  },
  {
    id: "batch-002",
    createdAt: "2026-01-20 15:08",
    scopeLabel: "Form 1A + Form 1B · Term 1 2026 (draft run)",
    classes: ["cls-1a", "cls-1b"],
    status: "partial",
    generated: 22,
    failed: [{ classId: "cls-1b", reason: "3 class-teacher comments missing" }],
    startedBy: "Mrs. Agnes Nyoni",
  },
];

/* ================================================================
 * Release management
 * ================================================================ */

export const releases: ClassRelease[] = [
  {
    classId: "cls-1a",
    releasedAt: "2026-01-24 08:00",
    releasedBy: "Mrs. Agnes Nyoni",
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
 * Verification (public)
 * ================================================================ */

export const verificationRecords: VerificationRecord[] = [
  {
    code: "JS26-T1-0147-9F3A",
    studentId: DEMO_IDS.studentId,
    cycleId: DEMO_IDS.reportCycleId,
    issuedAt: "2026-04-06",
    checksum: "SHA-256 · 9f3a…c21e",
    revoked: false,
  },
  {
    code: "JS26-T1-0152-77B2",
    studentId: "f1b-04",
    cycleId: DEMO_IDS.reportCycleId,
    issuedAt: "2026-04-06",
    checksum: "SHA-256 · 77b2…d904",
    revoked: false,
  },
  {
    code: "JS25-T3-0031-45C1",
    studentId: "f4a-02",
    cycleId: "cy0",
    issuedAt: "2025-12-05",
    checksum: "SHA-256 · 45c1…aa17",
    revoked: true,
  },
];

export type VerifyOutcome =
  | { state: "valid"; record: VerificationRecord }
  | { state: "not-found" }
  | { state: "tampered"; record: VerificationRecord }
  | { state: "revoked"; record: VerificationRecord };

export function verifyCode(raw: string): VerifyOutcome {
  const code = raw.trim().toUpperCase();
  if (code === "JS26-T1-0147-0000") {
    return {
      state: "tampered",
      record: verificationRecords[0],
    };
  }
  const found = verificationRecords.find((r) => r.code === code);
  if (!found) return { state: "not-found" };
  if (found.revoked) return { state: "revoked", record: found };
  return { state: "valid", record: found };
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
}

const classResultsCache = new Map<string, StudentResult[]>();

export function classResults(classId: string): StudentResult[] {
  const cached = classResultsCache.get(classId);
  if (cached) return cached;
  const rows = studentsInClass(classId).map((student) => {
    const marks: Record<string, number | null> = {};
    let total = 0;
    let count = 0;
    for (const sub of subjects) {
      const m = getMarks(classId, sub.id)[student.id];
      marks[sub.id] = m;
      if (m !== null) {
        total += m;
        count += 1;
      }
    }
    const average = count > 0 ? total / count : 0;
    return { student, marks, total, count, average, grade: count > 0 ? gradeFor(average, defaultScheme)?.grade ?? "F" : "-", rank: 0 };
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

export function subjectAveragesFor(classId: string): {
  subjectId: string;
  avg: number;
  passRate: number;
  highest: number;
  lowest: number;
  distribution: Record<string, number>;
}[] {
  return subjects.map((sub) => {
    const marks = Object.values(getMarks(classId, sub.id)).filter(
      (v): v is number => v !== null,
    );
    const avg = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0;
    const distribution: Record<string, number> = {};
    for (const b of boundaries) distribution[b.grade] = 0;
    for (const m of marks) {
      const g = gradeFor(m, defaultScheme)?.grade;
      if (g) distribution[g] += 1;
    }
    return {
      subjectId: sub.id,
      avg,
      passRate: marks.length ? Math.round((marks.filter((m) => m >= defaultScheme.passMark).length / marks.length) * 100) : 0,
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
  const gradeDistribution: Record<string, number> = {};
  for (const b of boundaries) gradeDistribution[b.grade] = 0;
  for (const m of allMarks) {
    const g = gradeFor(m, defaultScheme)?.grade;
    if (g) gradeDistribution[g] += 1;
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
    passRate: allMarks.length ? Math.round((allMarks.filter((m) => m >= defaultScheme.passMark).length / allMarks.length) * 100) : 0,
    gradeDistribution,
    classAverages: classes.map((c) => ({
      classId: c.id,
      name: c.name,
      avg: classResults(c.id).reduce((a, r) => a + r.average, 0) / classResults(c.id).length,
    })),
    subjectAverages: subjects.map((sub) => {
      const ms = classes.flatMap((c) =>
        Object.values(getMarks(c.id, sub.id)).filter((v): v is number => v !== null),
      );
      return {
        subjectId: sub.id,
        name: sub.name,
        department: sub.department,
        avg: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0,
        passRate: ms.length ? Math.round((ms.filter((m) => m >= defaultScheme.passMark).length / ms.length) * 100) : 0,
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
      const ms = classes.flatMap((c) =>
        Object.values(getMarks(c.id, sub.id)).filter((v): v is number => v !== null),
      );
      return {
        subjectId: sub.id,
        name: sub.name,
        avg: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0,
        passRate: ms.length ? Math.round((ms.filter((m) => m >= defaultScheme.passMark).length / ms.length) * 100) : 0,
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

export function studentAttendance(studentId: string): { present: number; total: number } {
  const rnd = mulberry32(hashStr(`attend|${studentId}`));
  const total = 62;
  const present = total - Math.floor(rnd() * 6);
  return { present, total };
}

export function studentEffort(studentId: string, subjectId: string): string {
  const rnd = mulberry32(hashStr(`effort|${studentId}|${subjectId}`));
  return ["A", "A", "B", "B", "C"][Math.floor(rnd() * 5)];
}

export function subjectRemark(mark: number): string {
  const g = gradeFor(mark, defaultScheme)?.grade ?? "F";
  if (g === "A") return "Excellent understanding of the topic.";
  if (g === "B") return "Very good performance. Keep improving.";
  if (g === "C") return "Good effort; revise weaker areas.";
  if (g === "D") return "Satisfactory; needs more practice.";
  if (g === "E") return "Pass; attend remedial sessions.";
  return "Must put in more effort next term.";
}

/** Convenience accessor for the demo parent (used across the portal). */
export const demoParent = {
  name: "Mr. Joseph Mwakalinga",
  children: [studentById(DEMO_IDS.studentId)!],
};
