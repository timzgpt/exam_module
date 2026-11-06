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
  /**
   * Whether this scheme uses NECTA-style subject points. Secondary (Form
   * 1-4) schemes do — points feed the best-7 division calculation. Primary
   * (Grades 1-7) schemes do not: primary reports show no points column, no
   * points total and no division.
   */
  usesPoints: boolean;
}

/* ---------------- Attendance (report cards, knowledge base A3.8) ---------------- */

/** Daily roll-call status, as typed in the ERP register. */
export type AttendanceStatus = "present" | "late" | "absent" | "excused";

/** Which rating band the attendance rate falls into (thresholds configurable). */
export type AttendanceRatingKey =
  | "excellent"
  | "good"
  | "needs-improvement"
  | "concern"
  | "none";

/**
 * Per-student attendance over a report cycle's attendance period (A3.8).
 * Computed from counted daily roll-call marks only: late counts as attended,
 * excused stays in the denominator, and days with no counted mark are shown
 * separately — they are never counted as absent.
 */
export interface AttendanceSummary {
  /** Attendance period covered (ISO dates). */
  from: string;
  to: string;
  /** Possible school days: weekdays minus holidays minus no-register days. */
  possibleSchoolDays: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Possible school days with no counted register mark. */
  notRecorded: number;
  /** present + late. */
  daysAttended: number;
  /** present + late + absent + excused. */
  daysRecorded: number;
  /** (present+late) / daysRecorded x 100 at 1 dp; null when nothing is recorded. */
  rate: number | null;
  rating: AttendanceRatingKey;
}

/* ---------------- Report cycles ---------------- */

export type CycleStatus =
  | "preparation"
  | "marks-entry"
  | "review"
  | "approved"
  | "released";

/** An exam that can feed a report cycle's card (mark-sheet column / card column). */
export type CycleExamKind = "monthly" | "mid-term" | "terminal" | "annual";

/**
 * One exam combined into a cycle's report card. A cycle carries a single
 * exam (weight 100) or a combination of two — the school's combinations are
 * "Monthly + Mid-Term" and "Mid-Term + Terminal". The Annual Exam always
 * runs on its own: combining it (e.g. Mid-Term + Annual) is not allowed.
 */
export interface CycleComponent {
  /** Column label on the mark sheet and card, e.g. "Monthly", "Mid-Term". */
  label: string;
  exam: CycleExamKind;
  /** Percentage weight — a cycle's components always sum to 100. */
  weight: number;
}

export interface ReportCycle {
  id: string;
  name: string;
  term: string;
  academicYear: string;
  /**
   * Which report engine this cycle's cards come from. The Mid-Term engine
   * counts a student with a single assessment at 100% in the chart's class
   * stats and shows the Best-Improvement badge on primary cards; the
   * Terminal engine only counts students with BOTH components in class
   * stats and never shows the improvement badge (chart prompt §4/§8).
   * Monthly Test cycles run the Mid-Term engine; Annual Exams run the
   * same Terminal engine.
   *
   * Cycle naming convention: "{Exam} - {year}" — "Mid term - 2026",
   * "Terminal Exam - 2026", "Annual Exam - 2026".
   */
  kind: CycleExamKind;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  closingDate: string;
  releaseDate: string;
  parentsDayDate: string;
  /** Report date printed on the card badge (never hard-coded in the view). */
  reportDate: string;
  /** When school reopens after this cycle's break (printed on the card badge). */
  schoolOpensDate: string;
  /** Attendance period (A3.8): defaults to term start -> report date. */
  attendanceFrom: string;
  /** Last day of the attendance period. */
  attendanceTo: string;
  /**
   * Exams combined into this cycle's card. Omitted (or a single entry) for
   * plain single-exam cycles, which keep the classic CA/Exam mark sheet;
   * two entries make it a COMBINED cycle — the mark sheet shows one column
   * per exam and the total weights them (e.g. Monthly 25 % + Mid-Term 75 %).
   */
  components?: CycleComponent[];
  /** Classes the cycle was set up for in the creation dialog (demo bookkeeping). */
  classIds?: string[];
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

/* ---------------- Nursery / Early Years report templates ---------------- */

/** The three education sections that each carry their own report cards. */
export type SchoolSection = "Early Years" | "Primary" | "Secondary";

/**
 * The report-card engines. Primary and Secondary are the existing
 * marks-based cards; the four Early Years kinds are observation /
 * competency templates selected per class (task §3).
 */
export type ReportTemplateKind =
  | "baby-class-a"
  | "baby-class-b"
  | "kg1"
  | "kg2"
  | "kg3"
  | "primary"
  | "secondary";

/** Codes of the Early Years competency grading scale (KG2 / KG3). */
export type CompetencyCode = "B" | "D" | "C" | "HC";

/**
 * The assessment period a KG3 card is produced for. KG3 is the only template
 * whose benchmark set changes by period: the Midterm set is shorter, the
 * End-of-Term set is extended. Every other template is period-invariant.
 */
export type NurseryPeriod = "midterm" | "terminal";

export interface CompetencyLevel {
  code: CompetencyCode;
  label: string;
  description: string;
}

export interface CompetencyScale {
  name: string;
  levels: CompetencyLevel[];
}

/** One developmental milestone / benchmark inside a learning area. */
export interface TemplateBenchmark {
  id: string;
  text: string;
}

/** One learning area (or developmental domain) of a nursery template. */
export interface TemplateLearningArea {
  id: string;
  name: string;
  benchmarks: TemplateBenchmark[];
}

/** An authorizing signature slot printed at the foot of every template. */
export interface TemplateSignature {
  id: string;
  title: string;
  name: string;
}

/**
 * Full configuration of ONE class's report template. Assignments are per
 * class (not per term), so a template is reusable across academic terms
 * without duplicating the design (task §4).
 */
export interface NurseryTemplateConfig {
  kind: Exclude<ReportTemplateKind, "primary" | "secondary">;
  classId: string;
  /** Printed inside the maroon title band, e.g. "DEVELOPMENTAL ASSESSMENT REPORT". */
  title: string;
  /** Caption of the assessment-date field (Template A: "Date of assessment"). */
  assessmentDateLabel: string;
  areas: TemplateLearningArea[];
  /** KG2 / KG3 competency scale; null where the template prints no grades. */
  scale: CompetencyScale | null;
  /** Benchmarks carry an individual competency grade (KG2 / KG3). */
  gradesPerBenchmark: boolean;
  /** Column caption for per-area remark text (Baby A / B, KG1); null = not printed. */
  areaRemarkLabel: string | null;
  /** Caption of the dedicated per-area comment row (KG2 / KG3); null = not printed. */
  areaCommentLabel: string | null;
  /** Caption above the class teacher's comment block. */
  classTeacherCommentLabel: string;
  signatures: TemplateSignature[];
}

/**
 * One learner's Early Years assessment for a cycle. Competency grades and
 * teacher remarks are stored independently, learning-area comments stay
 * separate from the class teacher's comment (task §5).
 */
export interface NurseryAssessment {
  classId: string;
  studentId: string;
  cycleId: string;
  /** Date of assessment printed on the card (Template A field). */
  assessedOn: string;
  /**
   * benchmarkId -> teacher's narrative remark / observation, written against
   * each individual benchmark (Baby A skill comments, Baby B & KG1 remarks).
   * The reference reports carry one remark per benchmark, not per area.
   */
  benchmarkRemarks: Record<string, string>;
  /** benchmarkId -> competency grade (KG2, KG3). */
  benchmarkGrades: Record<string, CompetencyCode | null>;
  /** areaId -> dedicated learning-area comment (KG2, KG3). */
  areaComments: Record<string, string>;
  /** The class teacher's concluding comment — never mixed with area text. */
  classTeacherComment: string;
}
