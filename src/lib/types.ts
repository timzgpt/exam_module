import type { LucideIcon } from "lucide-react";

/* ---------------- Departments / subjects / people ---------------- */

export type DepartmentName =
  | "Mathematics"
  | "Sciences"
  | "Languages"
  | "Humanities"
  | "ICT";

export interface Subject {
  id: string;
  name: string;
  code: string;
  department: DepartmentName;
}

/* ---------------- Class subjects ---------------- */

/** Core subjects are compulsory; subsidiaries are opt-in per student. */
export type SubjectType = "core" | "subsidiary";

/**
 * A subject assigned to a specific class for the term: which teacher delivers
 * it, how it is assessed and which students take it. Array position IS the
 * subject order used on the report card and in every marks-entry grid.
 */
export interface ClassSubject {
  subjectId: string;
  classId: string;
  type: SubjectType;
  /** Short name for narrow columns and broadsheets (keep under 12 chars). */
  chartLabel: string;
  teacherId: string;
  periodsPerWeek: number;
  /** Number of written papers sat at end of term (1 or 2). */
  examPapers: 1 | 2;
  /** Continuous-assessment weight out of 100 (tests, practicals, coursework). */
  caMarks: number;
  /** End-of-term written examination weight out of 100. */
  examMarks: number;
  /** CA + Exam (normally 100). Derived, kept for display. */
  fullMarks: number;
}

/** Status codes typed into the marks grid in place of a number. */
export type MarkStatusCode = "ABS" | "NA" | "NR" | "PENDING" | "DISQ";

export interface DivisionResult {
  division: "I" | "II" | "III" | "IV" | "0";
  label: string;
  /** Sum of the best 7 subject points (lower = better). */
  pointsSum: number;
  /** pointsSum - 17; 0 or less means Division I already achieved. */
  gapToDivisionI: number;
}

export interface Teacher {
  id: string;
  name: string;
  initials: string;
  subjectIds: string[];
  role: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  level: string;
  classTeacherId: string;
  room: string;
  /**
   * Report Overview "No Division" flag. When true the Points column and the
   * Division strip are hidden on this class's report cards — even for
   * secondary (NECTA CSEE) classes. Primary cards never show points or
   * division in the first place.
   */
  noDivision: boolean;
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  admissionNo: string;
  gender: "M" | "F";
}

/* ---------------- Exams ---------------- */

export type ExamStatus = "draft" | "scheduled" | "ongoing" | "completed";

export interface ExamSitting {
  subjectId: string;
  date: string; // ISO date
  startTime: string; // "08:00"
  durationMin: number;
  invigilatorId: string;
  venue: string;
}

export interface Exam {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  type: "Terminal" | "Mid-term" | "Monthly test" | "Mock";
  startDate: string;
  endDate: string;
  status: ExamStatus;
  sittings: ExamSitting[];
}

/* ---------------- Grading ---------------- */

export interface GradeBoundary {
  grade: string;
  min: number;
  max: number;
  points: number;
  remark: string;
}

export interface GradingScheme {
  id: string;
  name: string;
  academicYear: string;
  passMark: number;
  boundaries: GradeBoundary[];
}

/* ---------------- Report cycles ---------------- */

export type CycleStatus =
  | "preparation"
  | "marks-entry"
  | "review"
  | "approved"
  | "released";

export interface ReportCycle {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  closingDate: string;
  releaseDate: string;
  parentsDayDate: string;
}

/* ---------------- Marks / comments / results ---------------- */

export type DeadlineState = "complete" | "partial" | "pending" | "overdue";

export interface MarksDeadline {
  id: string;
  cycleId: string;
  classId: string;
  subjectId: string;
  dueDate: string;
  enteredBy: string | null;
  submittedAt: string | null;
  entriesDone: number;
  entriesTotal: number;
}

export interface CommentRecord {
  studentId: string;
  classTeacher: string | null;
  /**
   * Required summary of the parent/guardian's involvement this term.
   * Not optional: a comment record is only complete when this is filled in.
   */
  parentalInvolvement: string | null;
  status: "draft" | "submitted";
  updatedAt: string;
}

export type ApprovalState =
  | "not-submitted"
  | "submitted"
  | "changes-requested"
  | "approved";

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface ClassApproval {
  classId: string;
  status: ApprovalState;
  submittedAt: string | null;
  submittedBy: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  note: string | null;
  audit: AuditEntry[];
}

/* ---------------- Batches & release ---------------- */

export interface BatchRun {
  id: string;
  createdAt: string;
  scopeLabel: string;
  classes: string[];
  status: "completed" | "failed" | "partial";
  generated: number;
  failed: { classId: string; reason: string }[];
  startedBy: string;
}

export interface ClassRelease {
  classId: string;
  releasedAt: string | null;
  releasedBy: string | null;
  hold: { reason: string; detail: string } | null;
}

/* ---------------- Parents' day ---------------- */

export interface BookingSlot {
  id: string;
  teacherId: string;
  slot: string; // "09:00-09:15"
  bookedByStudentId: string | null;
}

/* ---------------- Targets ---------------- */

export interface StudentTarget {
  studentId: string;
  targetAverage: number;
  focus: string;
}

/* ---------------- Navigation ---------------- */

export interface NavItemDef {
  key: string;
  label: string;
  group: string;
  hrefTemplate: string; // may contain {cycleId} {classId} {studentId}
  /**
   * Additional href templates that resolve to the SAME host page (merged
   * features keep their original routes as thin wrappers). Used for active
   * highlighting and breadcrumbs; never rendered in the sidebar.
   */
  matchTemplates?: string[];
  icon: LucideIcon;
  description: string;
}

export interface NavigationContext {
  cycleId: string;
  classId: string;
  studentId: string;
}
