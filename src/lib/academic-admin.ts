import {
  allClasses,
  classSubjectsFor,
  classById,
  classes,
  eligibleStudentsFor,
  isPrimaryClass,
  studentsInClass,
  subjectById,
  subjectTeacherOf,
  subjects,
  teacherById,
} from "./demo-data";
import {
  BABY_A_AREAS,
  KG1_AREAS,
  KG2_AREAS,
  KG3_TERMINAL_AREAS,
  nurseryClasses,
  nurseryStudents,
} from "./nursery";
import type { ClassSubject, SchoolSection, Student } from "./types";

export type { SchoolSection };

/* ================================================================
 * Academic Administration — data model (module task §10)
 * ================================================================
 * The app has no server database yet: every module (report templates,
 * nursery assessments, viewer roles) persists its own relational records
 * in a zustand `persist` slice. This module follows the same pattern and
 * implements the logical entities from task §10 as FIRST-CLASS RELATIONAL
 * RECORDS (never comma-separated strings / JSON arrays):
 *
 *   academic_items               → AcademicItem
 *   curricula + curriculum_items → Curriculum (items embedded, versioned)
 *   class_curricula              → ClassCurriculumAdoption (key classId|year)
 *   teacher_item_assignments     → TeacherItemAssignment (history kept)
 *   subject_combinations         → SubjectCombination (+ item ids)
 *   student_subject_registrations→ StudentSubjectRegistration (one row each)
 *   assessment_configurations    → CurriculumItem.assessment + overrides
 *   academic_years/terms         → AcademicYearDef
 *   audit trail                  → AuditEntry
 *
 * SEEDING GUARANTEE: buildSeedAcademicState() derives every record from the
 * existing demo data (subjects, classSubjectsFor, subjectTeacherOf,
 * isEnrolledIn, nursery areas) deterministically. With the seed intact the
 * effective* helpers below return EXACTLY what classSubjectsFor /
 * eligibleStudentsFor / subjectTeacherOf return today, so marks entry,
 * report cards and analytics behave identically until an administrator
 * edits something.
 * ================================================================ */

export type AcademicItemType = "subject" | "learning-area";
export type AcademicItemStatus = "active" | "inactive";
export type CurriculumClassification = "core" | "optional";
export type CurriculumStatus = "draft" | "published";
export type RegistrationSource =
  | "auto-core"
  | "auto-area"
  | "individual"
  | "combination"
  | "bulk";
export type RegistrationMode = "individual" | "combinations" | "both";
export type AssignmentRole = "subject-teacher" | "class-teacher";
export type AssignmentStatus = "assigned" | "pending";

export interface AcademicItem {
  id: string;
  name: string;
  /** Unique within the catalogue (validated on register/edit). */
  code: string;
  type: AcademicItemType;
  category: string;
  description: string;
  sections: SchoolSection[];
  status: AcademicItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumAssessment {
  caMarks: number;
  examMarks: number;
  fullMarks: number;
  /** Early Years: developmental assessment model instead of marks. */
  developmentalModel: string[] | null;
}

export interface CurriculumItem {
  itemId: string;
  classification: CurriculumClassification;
  /** 1-based display order within the curriculum (report-card / grid order). */
  order: number;
  periodsPerWeek: number;
  examPapers: 1 | 2;
  chartLabel: string;
  assessment: CurriculumAssessment;
}

export interface Curriculum {
  id: string;
  name: string;
  section: SchoolSection;
  /** Class level the curriculum applies to, e.g. "Form 1", "Standard 5", "KG2". */
  level: string;
  academicYear: string;
  items: CurriculumItem[];
  version: number;
  status: CurriculumStatus;
  updatedAt: string;
}

/** One class stream adopting a curriculum for one academic year. */
export interface ClassCurriculumAdoption {
  classId: string;
  academicYear: string;
  curriculumId: string;
  status: CurriculumStatus;
  publishedAt: string | null;
}

export interface TeacherItemAssignment {
  id: string;
  teacherId: string;
  classId: string;
  itemId: string;
  academicYear: string;
  role: AssignmentRole;
  status: AssignmentStatus;
  assignedAt: string;
  /** Set when reassigned — the previous row is kept for history. */
  endsAt: string | null;
}

export interface SubjectCombination {
  id: string;
  name: string;
  code: string;
  /** Form level the combination is offered at, e.g. "Form 1". */
  level: string;
  itemIds: string[];
  minSelections: number | null;
  maxSelections: number | null;
  status: AcademicItemStatus;
}

export interface StudentSubjectRegistration {
  id: string;
  studentId: string;
  classId: string;
  itemId: string;
  academicYear: string;
  classification: CurriculumClassification;
  source: RegistrationSource;
  combinationId: string | null;
  /** Dropping keeps the row (history) — only `status` changes. */
  status: "active" | "dropped";
  registeredAt: string;
  droppedAt: string | null;
}

export interface AcademicYearDef {
  year: string;
  terms: string[];
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
}

export interface AcademicAdminData {
  seedVersion: number;
  items: AcademicItem[];
  curricula: Curriculum[];
  /** Key: `${classId}|${academicYear}`. */
  adoptions: Record<string, ClassCurriculumAdoption>;
  assignments: TeacherItemAssignment[];
  combinations: SubjectCombination[];
  registrations: StudentSubjectRegistration[];
  /** Key: `${classId}|${academicYear}`. */
  registrationModes: Record<string, RegistrationMode>;
  /** Key: `${classId}|${itemId}` — per class-item assessment override. */
  assessmentOverrides: Record<
    string,
    { caMarks: number; examMarks: number; fullMarks: number }
  >;
  years: AcademicYearDef[];
  audit: AuditEntry[];
}

export const ACADEMIC_SEED_VERSION = 1;
const NOW = "2026-01-15T08:00:00.000Z";

/* ================================================================
 * Seed
 * ================================================================ */

const EARLY_YEARS_AREA_SOURCES = [
  BABY_A_AREAS,
  KG1_AREAS,
  KG2_AREAS,
  KG3_TERMINAL_AREAS,
];

/** Nursery template area names → catalogue learning areas (registered once). */
function seedLearningAreaItems(): AcademicItem[] {
  const seen = new Map<string, AcademicItem>();
  const usedCodes = new Set<string>([
    ...subjects.map((s) => s.code.toUpperCase()),
  ]);
  const order = [
    "Physical Development",
    "Language Development",
    "Social and Emotional Development",
    "Cognitive Development",
    "Kindergarten Arithmetic",
    "Early Language & Communication",
    "Creative Arts and Sensory Play",
    "Social Skills",
    "Pre-Early Language & Communication",
    "Early Lifeskills (Relations)",
    "Creative Art & Sensory Play",
    "Social & Developmental Learning Skills",
    "Early Numeracy",
    "Sports, Arts & Crafts",
    "Health & Environmental Care",
    "Culture & Religion",
  ];
  for (const areas of EARLY_YEARS_AREA_SOURCES) {
    for (const a of areas) {
      if (seen.has(a.name)) continue;
      let code = laCode(a.name);
      let n = 2;
      while (usedCodes.has(code)) code = `${laCode(a.name)}-${n++}`;
      usedCodes.add(code);
      seen.set(a.name, {
        id: `item-la-${a.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
        name: a.name,
        code,
        type: "learning-area",
        category: learningAreaCategory(a.name),
        description: `Early Years developmental learning area (curriculum structure from the school's report templates).`,
        sections: ["Early Years"],
        status: "active",
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  }
  // Keep a stable, human-friendly order in the catalogue table.
  return [...seen.values()].sort(
    (a, b) =>
      order.indexOf(a.name) - order.indexOf(b.name) || a.name.localeCompare(b.name),
  );
}

function laCode(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean);
  return words.map((w) => w.slice(0, 3).toUpperCase()).join("").slice(0, 6);
}

function learningAreaCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("numer") || n.includes("arithmetic")) return "Numeracy";
  if (n.includes("language") || n.includes("communication")) return "Communication";
  if (n.includes("physical") || n.includes("sports") || n.includes("health"))
    return "Physical & Health";
  if (n.includes("creativ") || n.includes("art") || n.includes("culture"))
    return "Creative & Culture";
  return "Developmental";
}

function seedSubjectItems(): AcademicItem[] {
  return subjects.map((s) => ({
    id: `item-${s.id}`,
    name: s.name,
    code: s.code,
    type: "subject" as const,
    category: s.department,
    description: `${s.name} (${s.code}) — ${s.department} department.`,
    sections: isPrimarySubject(s.id) ? ["Primary", "Secondary"] : ["Secondary"],
    status: "active" as const,
    createdAt: NOW,
    updatedAt: NOW,
  }));
}

/** In the demo every subject runs in both sections (s9 subsidiary opt-in). */
function isPrimarySubject(_subjectId: string): boolean {
  return true;
}

export function buildSeedAcademicState(): AcademicAdminData {
  const items = [...seedSubjectItems(), ...seedLearningAreaItems()];
  const itemBySubjectId = (sid: string) => `item-${sid}`;
  const year = "2026";
  const terms = ["Term 1", "Term 2", "Term 3"];

  /* ── Curricula: one per class level, items copied from demo allocation ── */
  const curricula: Curriculum[] = [];

  const subjectCurriculumForLevel = (
    id: string,
    name: string,
    section: SchoolSection,
    level: string,
  ): Curriculum => ({
    id,
    name,
    section,
    level,
    academicYear: year,
    version: 1,
    status: "published",
    updatedAt: NOW,
    items: classSubjectsFor("cls-1a").map((cs, i) => {
      const sub = subjectById(cs.subjectId)!;
      const optional = cs.type === "subsidiary";
      return {
        itemId: itemBySubjectId(cs.subjectId),
        classification: optional ? "optional" : "core",
        order: i + 1,
        periodsPerWeek: cs.periodsPerWeek,
        examPapers: cs.examPapers,
        chartLabel: sub.code,
        assessment: {
          caMarks: cs.caMarks,
          examMarks: cs.examMarks,
          fullMarks: cs.fullMarks,
          developmentalModel: null,
        },
      };
    }),
  });

  curricula.push(
    subjectCurriculumForLevel(
      "cur-primary-standard-5",
      "Primary curriculum — Standard 5",
      "Primary",
      "Standard 5",
    ),
  );
  for (const f of ["Form 1", "Form 2", "Form 3", "Form 4"]) {
    curricula.push(
      subjectCurriculumForLevel(
        `cur-secondary-${f.toLowerCase().replace(" ", "-")}`,
        `Secondary curriculum — ${f}`,
        "Secondary",
        f,
      ),
    );
  }

  const nurseryLevelAreas: [string, string, typeof BABY_A_AREAS][] = [
    ["Baby Class", "cur-early-years-baby", BABY_A_AREAS],
    ["KG1", "cur-early-years-kg1", KG1_AREAS],
    ["KG2", "cur-early-years-kg2", KG2_AREAS],
    ["KG3", "cur-early-years-kg3", KG3_TERMINAL_AREAS],
  ];
  for (const [level, id, areas] of nurseryLevelAreas) {
    curricula.push({
      id,
      name: `Early Years curriculum — ${level}`,
      section: "Early Years",
      level,
      academicYear: year,
      version: 1,
      status: "published",
      updatedAt: NOW,
      items: areas.map((a, i) => {
        const item = items.find((it) => it.name === a.name)!;
        return {
          itemId: item.id,
          classification: "core" as const,
          order: i + 1,
          periodsPerWeek: 5,
          examPapers: 1 as const,
          chartLabel: laCode(a.name),
          assessment: {
            caMarks: 0,
            examMarks: 0,
            fullMarks: 0,
            developmentalModel: [
              "Emerging",
              "Developing",
              "Achieved",
              "Exceeding Expectations",
            ],
          },
        };
      }),
    });
  }

  /* ── Adoptions: every existing class adopts its level curriculum ── */
  const adoptions: Record<string, ClassCurriculumAdoption> = {};
  for (const cls of allClasses) {
    const curriculum = curricula.find(
      (c) => c.level === cls.level && c.academicYear === year,
    );
    if (!curriculum) continue;
    adoptions[`${cls.id}|${year}`] = {
      classId: cls.id,
      academicYear: year,
      curriculumId: curriculum.id,
      status: "published",
      publishedAt: NOW,
    };
  }

  /* ── Teacher assignments: mirror demo subjectTeacherOf per class ── */
  const assignments: TeacherItemAssignment[] = [];
  for (const cls of classes) {
    for (const cs of classSubjectsFor(cls.id)) {
      const teacher =
        subjectTeacherOf(cs.subjectId, cls.id) ?? teacherById(cls.classTeacherId);
      if (!teacher) continue;
      assignments.push({
        id: `ta-${cls.id}-${cs.subjectId}`,
        teacherId: teacher.id,
        classId: cls.id,
        itemId: itemBySubjectId(cs.subjectId),
        academicYear: year,
        role: "subject-teacher",
        status: "assigned",
        assignedAt: NOW,
        endsAt: null,
      });
    }
  }
  for (const cls of nurseryClasses) {
    const curriculum = curricula.find((c) => c.level === cls.level);
    for (const ci of curriculum?.items ?? []) {
      assignments.push({
        id: `ta-${cls.id}-${ci.itemId}`,
        teacherId: cls.classTeacherId,
        classId: cls.id,
        itemId: ci.itemId,
        academicYear: year,
        role: "class-teacher",
        status: "assigned",
        assignedAt: NOW,
        endsAt: null,
      });
    }
  }

  /* ── Registrations: mirror demo eligibility exactly ── */
  const registrations: StudentSubjectRegistration[] = [];
  const register = (
    student: Student,
    itemId: string,
    classification: CurriculumClassification,
    source: RegistrationSource,
  ) =>
    registrations.push({
      id: `reg-${student.classId}-${student.id}-${itemId}`,
      studentId: student.id,
      classId: student.classId,
      itemId,
      academicYear: year,
      classification,
      source,
      combinationId: null,
      status: "active",
      registeredAt: NOW,
      droppedAt: null,
    });

  for (const cls of classes) {
    const curriculum = curricula.find((c) => c.level === cls.level);
    for (const student of studentsInClass(cls.id)) {
      for (const ci of curriculum?.items ?? []) {
        const subjectId = ci.itemId.replace("item-", "");
        if (ci.classification === "core") {
          register(student, ci.itemId, "core", "auto-core");
        } else if (eligibleStudentsFor(cls.id, subjectId).some((s) => s.id === student.id)) {
          // Seed mirrors isEnrolledIn so the demo behaves identically.
          register(student, ci.itemId, "optional", "individual");
        }
      }
    }
  }
  for (const cls of nurseryClasses) {
    const curriculum = curricula.find((c) => c.level === cls.level);
    for (const student of nurseryStudents.filter((s) => s.classId === cls.id)) {
      for (const ci of curriculum?.items ?? []) {
        register(student, ci.itemId, "core", "auto-area");
      }
    }
  }

  /* ── Combinations (school-configured, editable examples) ── */
  const optionalItem = (sid: string) => itemBySubjectId(sid);
  const combinations: SubjectCombination[] = [
    {
      id: "combo-science",
      name: "Combination A — Science",
      code: "SCI",
      level: "Form 1",
      itemIds: [
        optionalItem("s4"),
        optionalItem("s5"),
        optionalItem("s6"),
      ],
      minSelections: 2,
      maxSelections: 3,
      status: "active",
    },
    {
      id: "combo-humanities",
      name: "Combination B — Humanities",
      code: "HUM",
      level: "Form 1",
      itemIds: [
        optionalItem("s7"),
        optionalItem("s8"),
        optionalItem("s9"),
      ],
      minSelections: 2,
      maxSelections: 3,
      status: "active",
    },
    {
      id: "combo-mixed",
      name: "Combination C — Mixed",
      code: "MIX",
      level: "Form 1",
      itemIds: [
        optionalItem("s4"),
        optionalItem("s7"),
        optionalItem("s9"),
      ],
      minSelections: 2,
      maxSelections: 3,
      status: "active",
    },
  ];

  const registrationModes: Record<string, RegistrationMode> = {};
  for (const cls of allClasses) {
    registrationModes[`${cls.id}|${year}`] =
      cls.level.startsWith("Form") ? "both" : "individual";
  }

  return {
    seedVersion: ACADEMIC_SEED_VERSION,
    items,
    curricula,
    adoptions,
    assignments,
    combinations,
    registrations,
    registrationModes,
    assessmentOverrides: {},
    years: [{ year, terms }],
    audit: [
      {
        id: "audit-seed",
        at: NOW,
        actor: "system",
        action: "seed",
        entity: "module",
        entityId: "academic-admin",
        detail:
          "Catalogue, curricula, adoptions, teacher assignments and registrations seeded from the school's existing allocation.",
      },
    ],
  };
}

/* ================================================================
 * Pure helpers — everything the pages and integrations need.
 * All take data slices explicitly so they are unit-testable (bun).
 * ================================================================ */

export const adoptionKey = (classId: string, year: string) => `${classId}|${year}`;
export const assessmentKey = (classId: string, itemId: string) => `${classId}|${itemId}`;

export function itemById(
  data: Pick<AcademicAdminData, "items">,
  id: string,
): AcademicItem | undefined {
  return data.items.find((i) => i.id === id);
}

export function itemBySubject(data: AcademicAdminData, subjectId: string): AcademicItem | undefined {
  return data.items.find((i) => i.id === `item-${subjectId}`);
}

/** Curriculum adopted by a class for an academic year (undefined = none). */
export function adoptedCurriculum(
  data: Pick<AcademicAdminData, "adoptions" | "curricula">,
  classId: string,
  year = "2026",
): Curriculum | undefined {
  const adoption = data.adoptions[adoptionKey(classId, year)];
  return adoption ? data.curricula.find((c) => c.id === adoption.curriculumId) : undefined;
}

const DEMO_WEIGHTS = { caMarks: 25, examMarks: 75, fullMarks: 100 };

/**
 * Effective per-class subject allocation (report-card / marks-grid order)
 * built from the adopted curriculum. Falls back to the demo allocation when
 * the class has no adoption, so existing pipelines never break.
 */
export function effectiveClassSubjectsFor(
  data: Pick<AcademicAdminData, "curricula" | "adoptions" | "assignments" | "assessmentOverrides">,
  classId: string,
  year = "2026",
): ClassSubject[] {
  const curriculum = adoptedCurriculum(data, classId, year);
  if (!curriculum) return classSubjectsFor(classId);
  const cls = classById(classId);
  return curriculum.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((ci): ClassSubject => {
      const subject = subjectById(ci.itemId.replace("item-", ""));
      const assignment = activeAssignmentFor(data, classId, ci.itemId);
      const override = data.assessmentOverrides[assessmentKey(classId, ci.itemId)];
      const ca = override?.caMarks ?? ci.assessment.caMarks;
      const exam = override?.examMarks ?? ci.assessment.examMarks;
      return {
        subjectId: ci.itemId.replace("item-", ""),
        classId,
        type: ci.classification === "core" ? "core" : "subsidiary",
        chartLabel: ci.chartLabel || subject?.code || "",
        teacherId:
          assignment?.teacherId ??
          subjectTeacherOf(ci.itemId.replace("item-", ""), classId)?.id ??
          cls?.classTeacherId ??
          teacherById("")?.id ??
          "",
        periodsPerWeek: ci.periodsPerWeek,
        examPapers: ci.examPapers,
        caMarks: ca,
        examMarks: exam,
        fullMarks: override?.fullMarks ?? (ca + exam || ci.assessment.fullMarks),
      };
    });
}

/** Active teacher assignment for one class + item (latest wins). */
export function activeAssignmentFor(
  data: Pick<AcademicAdminData, "assignments">,
  classId: string,
  itemId: string,
  year = "2026",
): TeacherItemAssignment | undefined {
  const rows = data.assignments.filter(
    (a) =>
      a.classId === classId &&
      a.itemId === itemId &&
      a.status === "assigned" &&
      a.endsAt === null &&
      a.academicYear === year,
  );
  return rows.sort((a, b) => b.assignedAt.localeCompare(a.assignedAt))[0];
}

/**
 * Subject ids the viewer may enter marks for in a class (task §12/§13).
 * When the academic store holds teacher assignments for the class they are
 * authoritative and the scoping is strict: a subject teacher with no active
 * assignment rows in a configured class sees NOTHING there. Classes without
 * any assignment rows fall back to the legacy demo derivation so the app
 * keeps working if configuration is reset.
 */
export function effectiveAssignedSubjectIds(
  data: Pick<AcademicAdminData, "curricula" | "adoptions" | "assignments" | "assessmentOverrides">,
  viewer: { role: string; teacherId: string | null },
  classId: string,
): string[] {
  const all = effectiveClassSubjectsFor(data, classId).map((cs) => cs.subjectId);
  if (viewer.role !== "subject-teacher" || !viewer.teacherId) return all;
  const classConfigured = data.assignments.some(
    (a) => a.classId === classId && a.academicYear === "2026",
  );
  if (!classConfigured) {
    return all.filter((sid) => subjectTeacherOf(sid, classId)?.id === viewer.teacherId);
  }
  const mine = data.assignments.filter(
    (a) =>
      a.classId === classId &&
      a.teacherId === viewer.teacherId &&
      a.status === "assigned" &&
      a.endsAt === null &&
      a.academicYear === "2026",
  );
  const mineItems = new Set(mine.map((a) => a.itemId));
  return all.filter((sid) => mineItems.has(`item-${sid}`));
}

/**
 * Students actively registered for a class item. Returns null when the
 * class has no registration records yet (caller falls back to demo
 * eligibility).
 */
export function registeredStudentsFor(
  data: Pick<AcademicAdminData, "registrations">,
  classId: string,
  itemId: string,
  year = "2026",
): Student[] | null {
  const rows = data.registrations.filter(
    (r) => r.classId === classId && r.itemId === itemId && r.academicYear === year,
  );
  if (rows.length === 0) return null;
  const active = new Set(rows.filter((r) => r.status === "active").map((r) => r.studentId));
  return studentsInClass(classId).filter((s) => active.has(s.id));
}

export function registeredItemIdsForStudent(
  data: Pick<AcademicAdminData, "registrations">,
  classId: string,
  studentId: string,
  year = "2026",
): string[] | null {
  const rows = data.registrations.filter(
    (r) => r.classId === classId && r.studentId === studentId && r.academicYear === year,
  );
  if (rows.length === 0) return null;
  return rows.filter((r) => r.status === "active").map((r) => r.itemId);
}

/** Whether an item can be removed from a class allocation (no history). */
export function itemHasHistory(
  data: AcademicAdminData,
  itemId: string,
  classId?: string,
): boolean {
  const inRegistrations = data.registrations.some(
    (r) => r.itemId === itemId && (!classId || r.classId === classId),
  );
  const inAssignments = data.assignments.some(
    (a) => a.itemId === itemId && (!classId || a.classId === classId),
  );
  return inRegistrations || inAssignments;
}

export interface ItemUsage {
  curricula: Curriculum[];
  adoptions: { classId: string; curriculumId: string }[];
  registrations: number;
  assignments: number;
}

export function itemUsage(
  data: Pick<AcademicAdminData, "curricula" | "adoptions" | "assignments" | "registrations">,
  itemId: string,
): ItemUsage {
  return {
    curricula: data.curricula.filter((c) => c.items.some((ci) => ci.itemId === itemId)),
    adoptions: Object.values(data.adoptions)
      .filter((a) => {
        const c = data.curricula.find((x) => x.id === a.curriculumId);
        return c?.items.some((ci) => ci.itemId === itemId);
      })
      .map((a) => ({ classId: a.classId, curriculumId: a.curriculumId })),
    registrations: data.registrations.filter((r) => r.itemId === itemId && r.status === "active")
      .length,
    assignments: data.assignments.filter((a) => a.itemId === itemId && a.endsAt === null).length,
  };
}

/** Teacher workload: distinct classes and items from active assignments. */
export function workloadFor(
  data: Pick<AcademicAdminData, "assignments" | "curricula">,
  teacherId: string,
  year = "2026",
): { classes: string[]; items: { itemId: string; classId: string }[]; periods: number } {
  const rows = data.assignments.filter(
    (a) => a.teacherId === teacherId && a.status === "assigned" && a.endsAt === null && a.academicYear === year,
  );
  const items = rows.map((a) => ({ itemId: a.itemId, classId: a.classId }));
  let periods = 0;
  for (const r of rows) {
    const curriculum = data.curricula.find((c) =>
      c.items.some((ci) => ci.itemId === r.itemId),
    );
    periods += curriculum?.items.find((ci) => ci.itemId === r.itemId)?.periodsPerWeek ?? 0;
  }
  return { classes: [...new Set(rows.map((a) => a.classId))], items, periods };
}

/* ── Catalogue validation ─────────────────────────────────────────── */

export function validateItem(
  data: AcademicAdminData,
  draft: Pick<AcademicItem, "name" | "code" | "type" | "sections" | "category">,
  editingId?: string,
): string[] {
  const errors: string[] = [];
  if (!draft.name.trim()) errors.push("Name is required.");
  if (!draft.code.trim()) errors.push("Code is required.");
  if (!draft.category?.trim()) errors.push("Category is required.");
  if (draft.sections.length === 0)
    errors.push("Choose at least one applicable school section.");
  const code = draft.code.trim().toUpperCase();
  const clash = data.items.find(
    (i) => i.code.toUpperCase() === code && i.id !== editingId,
  );
  if (clash) errors.push(`Code ${code} is already used by ${clash.name}.`);
  const nameClash = data.items.find(
    (i) => i.name.trim().toLowerCase() === draft.name.trim().toLowerCase() && i.id !== editingId,
  );
  if (nameClash) errors.push(`An item named "${nameClash.name}" already exists.`);
  return errors;
}

/* ── Registration validation (task §5.C Step 4 / §8) ──────────────── */

export interface RegistrationValidation {
  errors: string[];
  warnings: string[];
}

export function validateRegistration(
  data: Pick<AcademicAdminData, "curricula" | "adoptions" | "registrations" | "items" | "combinations" | "registrationModes">,
  studentId: string,
  classId: string,
  optionalItemIds: string[],
  combinationId: string | null = null,
  year = "2026",
): RegistrationValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const curriculum = adoptedCurriculum(data, classId, year);
  if (!curriculum) {
    errors.push("The class has no adopted curriculum.");
    return { errors, warnings };
  }
  const optionalAvailable = curriculum.items.filter((ci) => ci.classification === "optional");
  const availableIds = new Set(optionalAvailable.map((ci) => ci.itemId));
  const active = new Set(
    data.registrations
      .filter(
        (r) =>
          r.classId === classId &&
          r.studentId === studentId &&
          r.academicYear === year &&
          r.status === "active" &&
          r.classification === "optional",
      )
      .map((r) => r.itemId),
  );
  const activeAny = new Set(
    data.registrations
      .filter(
        (r) =>
          r.classId === classId &&
          r.studentId === studentId &&
          r.academicYear === year &&
          r.status === "active",
      )
      .map((r) => r.itemId),
  );
  for (const id of optionalItemIds) {
    if (!availableIds.has(id))
      errors.push(`${itemById(data, id)?.name ?? id} is not offered by this class's curriculum.`);
    if (activeAny.has(id))
      errors.push(`${itemById(data, id)?.name ?? id} is already registered.`);
  }
  const total = [...active].length + optionalItemIds.filter((id) => !active.has(id)).length;
  const mode = data.registrationModes[adoptionKey(classId, year)] ?? "individual";
  if (combinationId) {
    const combo = data.combinations.find((c) => c.id === combinationId);
    if (!combo) errors.push("Selected combination not found.");
    else {
      if (combo.level !== curriculum.level)
        errors.push(`${combo.name} is offered for ${combo.level}, not ${curriculum.level}.`);
      for (const id of optionalItemIds)
        if (!combo.itemIds.includes(id))
          errors.push(
            `${itemById(data, id)?.name ?? id} is not part of ${combo.name}.`,
          );
    }
  }
  if (mode !== "individual") {
    const combo = data.combinations.find((c) => c.id === combinationId);
    const min = combo?.minSelections ?? null;
    const max = combo?.maxSelections ?? null;
    if (min !== null && total < min)
      errors.push(`At least ${min} optional subjects must be selected.`);
    if (max !== null && total > max)
      errors.push(`At most ${max} optional subjects may be selected.`);
  }
  return { errors, warnings };
}

/* ── Class configuration completeness (task §2 / §13) ─────────────── */

export interface ClassCompleteness {
  allocation: boolean;
  teachers: boolean;
  registrations: boolean;
  assessment: boolean;
  score: number; // 0-100
}

export function classCompleteness(
  data: Pick<AcademicAdminData, "curricula" | "adoptions" | "assignments" | "registrations" | "items">,
  classId: string,
  year = "2026",
): ClassCompleteness {
  const curriculum = adoptedCurriculum(data, classId, year);
  const allocation = !!curriculum;
  const items = curriculum?.items ?? [];
  const teachers =
    items.length > 0 &&
    items.every((ci) => activeAssignmentFor(data, classId, ci.itemId, year));
  const students =
    classById(classId) && !nurseryClasses.some((c) => c.id === classId)
      ? studentsInClass(classId)
      : nurseryStudents.filter((s) => s.classId === classId);
  const registrations =
    items.length > 0 &&
    students.length > 0 &&
    students.every((s) => {
      const rows = data.registrations.filter(
        (r) =>
          r.classId === classId && r.studentId === s.id && r.academicYear === year && r.status === "active",
      );
      return rows.length > 0;
    });
  const assessment =
    items.length > 0 &&
    items.every(
      (ci) =>
        ci.assessment.developmentalModel !== null ||
        ci.assessment.caMarks + ci.assessment.examMarks > 0,
    );
  const flags = [allocation, teachers, registrations, assessment];
  const score = Math.round((flags.filter(Boolean).length / flags.length) * 100);
  return { allocation, teachers, registrations, assessment, score };
}

/** Class levels per section, from the real class lists. */
export function levelsForSection(section: SchoolSection): string[] {
  if (section === "Early Years")
    return [...new Set(nurseryClasses.map((c) => c.level))];
  return [...new Set(classes.filter((c) => section === "Secondary" === c.level.startsWith("Form")).map((c) => c.level))];
}

/** Classes in a section, optionally filtered by level. */
export function classesForSection(section: SchoolSection, level?: string) {
  return allClasses.filter((c) => {
    const isNursery = nurseryClasses.some((n) => n.id === c.id);
    const belongs =
      section === "Early Years"
        ? isNursery
        : !isNursery && (section === "Secondary") === c.level.startsWith("Form");
    return belongs && (!level || c.level === level);
  });
}

/** Sections an item serves (catalogue availability). */
export function itemSectionLabel(item: AcademicItem): string {
  return item.sections.join(" · ");
}

export const DEMO_ASSESSMENT = DEMO_WEIGHTS;
