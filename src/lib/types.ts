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
  headTeacher: string | null;
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

/* ---------------- Verification ---------------- */

export interface VerificationRecord {
  code: string;
  studentId: string;
  cycleId: string;
  issuedAt: string;
  checksum: string;
  revoked: boolean;
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
