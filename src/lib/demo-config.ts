/**
 * Centralized demo route configuration.
 *
 * These identifiers are temporary demonstration values. Deo will connect the
 * application to real backend data in a future implementation. Every route in
 * the app is built from dynamic segments, so replacing these values (or the
 * helpers below) with real IDs requires no redesign of the navigation.
 */

export const DEMO_IDS = {
  /** Currently selected report cycle (demo: Term 1 · 2026). */
  reportCycleId: "cy1",
  /** Currently selected class (demo: Form 3A). */
  classId: "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21",
  /** Currently selected student (demo: Amina Joseph Mwakalinga). */
  studentId: "st1",
} as const;

export const SCHOOL = {
  name: "Josephian Schools",
  motto: "Character Building, Active Learning, Inclusivity, Skill Building",
  address: "Rafia, Bagamoyo Road, Mbezi Beach, Dar es Salaam",
  phone: "+255 713 615 254",
  email: "info@josephian.ac.tz",
  reportsBrand: "School Reports",
  academicYear: "2026",
} as const;

/**
 * Bursary contact details shown to parents on the card-on-hold page. Kept
 * here (not hardcoded in the page) so a real contact change happens in one
 * place. Note the bursary email intentionally differs from SCHOOL.email.
 */
export const BURSARY = {
  phoneDisplay: "+255 754 000 210",
  phoneHref: "tel:+255754000210",
  email: "accounts@josephian.ac.tz",
} as const;

/** Fixed demo "today" used for relative-date calculations in demo data. */
export const DEMO_TODAY = "2026-03-11";

/** Staff member who reviews, approves and releases report cards in the demo data. */
export const ACADEMIC_APPROVER = "Mrs. Agnes Nyoni";

/** Previous-term baseline the management dashboard compares the cycle average against. */
export const PREV_TERM_BASELINE_AVERAGE = 62.4;

/**
 * Build a contextual route from a template such as
 * `/academic/report-cycles/{cycleId}/classes/{classId}/marks`.
 */
export function resolveHref(
  template: string,
  ctx: { cycleId: string; classId: string; studentId: string },
): string {
  return template
    .replaceAll("{cycleId}", ctx.cycleId)
    .replaceAll("{classId}", ctx.classId)
    .replaceAll("{studentId}", ctx.studentId);
}

/** Convenience builders used across pages so routes are never hand-typed. */
export const routes = {
  exams: "/academic/exams",
  gradingSchemes: "/academic/grading-schemes",
  reportTemplates: "/academic/report-templates",
  reportCycles: "/academic/report-cycles",
  readiness: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/readiness`,
  deadlines: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/deadlines`,
  marks: (cycleId = DEMO_IDS.reportCycleId, classId = DEMO_IDS.classId) =>
    `/academic/report-cycles/${cycleId}/classes/${classId}/marks`,
  comments: (cycleId = DEMO_IDS.reportCycleId, classId = DEMO_IDS.classId) =>
    `/academic/report-cycles/${cycleId}/classes/${classId}/comments`,
  reportCard: (
    cycleId = DEMO_IDS.reportCycleId,
    studentId = DEMO_IDS.studentId,
  ) => `/academic/report-cycles/${cycleId}/students/${studentId}/report-card`,
  review: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/review`,
  batches: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/batches`,
  release: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/release`,
  departments: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/departments`,
  dashboard: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/dashboard`,
  publicSummary: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/public-summary`,
  parentsDay: (cycleId = DEMO_IDS.reportCycleId) =>
    `/academic/report-cycles/${cycleId}/parents-day`,
  classSubjects: (classId = DEMO_IDS.classId) =>
    `/academic/classes/${classId}/subjects`,
  classResults: (cycleId = DEMO_IDS.reportCycleId, classId = DEMO_IDS.classId) =>
    `/academic/report-cycles/${cycleId}/classes/${classId}/results`,
  classTargets: (
    cycleId = DEMO_IDS.reportCycleId,
    classId = DEMO_IDS.classId,
  ) => `/academic/report-cycles/${cycleId}/classes/${classId}/targets`,
  portalReportCards: "/portal/report-cards",
  portalOnHold: "/portal/report-cards/on-hold",
  portalProgress: "/portal/progress",
  portalParentsDay: "/portal/parents-day",
} as const;
