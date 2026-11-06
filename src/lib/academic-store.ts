"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useMemo } from "react";
import {
  ACADEMIC_SEED_VERSION,
  adoptionKey,
  effectiveAssignedSubjectIds,
  effectiveClassSubjectsFor,
  registeredItemIdsForStudent,
  assessmentKey,
  buildSeedAcademicState,
  itemById,
  itemHasHistory,
  validateItem,
  validateRegistration,
  type AcademicAdminData,
  type AcademicItem,
  type AuditEntry,
  type ClassCurriculumAdoption,
  type Curriculum,
  type RegistrationMode,
  type StudentSubjectRegistration,
  type SubjectCombination,
  type TeacherItemAssignment,
} from "./academic-admin";
import { classes, studentsInClass } from "./demo-data";
import type { ClassRoom, ClassSubject } from "./types";
import { useViewer } from "./viewer";

/**
 * Persisted store for the Academic Management module (task §10). All records
 * are relational rows (see academic-admin.ts); actions enforce the module's
 * governance rules (task §13): only Academic Masters and Administrators may
 * mutate configuration, and every mutation appends an audit entry.
 *
 * The store seeds itself from buildSeedAcademicState() on first use — with
 * the seed intact every derived view matches the existing demo behaviour.
 */

const MANAGE_ROLES = new Set(["academic-master", "administrator"]);

export function currentActor(): string {
  const v = useViewer.getState();
  if (v.role === "administrator") return "Administrator";
  if (v.role === "subject-teacher" && v.teacherId)
    return `subject-teacher:${v.teacherId}`;
  return "academic-master";
}

function audit(
  data: AcademicAdminData,
  action: string,
  entity: string,
  entityId: string,
  detail: string,
): AuditEntry {
  return {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    actor: currentActor(),
    action,
    entity,
    entityId,
    detail,
  };
}

/** Guard used by every mutating action. Returns an error toast message or null. */
function guard(role?: string): string | null {
  const r = role ?? useViewer.getState().role;
  if (!MANAGE_ROLES.has(r))
    return "Only an Academic Master or Administrator can change academic configuration.";
  return null;
}

export interface AcademicActionResult {
  ok: boolean;
  error?: string;
}

interface AcademicAdminState extends AcademicAdminData {
  /* catalogue */
  registerItem: (
    draft: Omit<AcademicItem, "id" | "createdAt" | "updatedAt">,
  ) => AcademicActionResult;
  updateItem: (id: string, patch: Partial<AcademicItem>) => AcademicActionResult;
  archiveItem: (id: string) => AcademicActionResult;
  /* curricula */
  createCurriculum: (
    draft: Pick<Curriculum, "section" | "level" | "academicYear" | "name">,
  ) => AcademicActionResult & { curriculumId?: string };
  addItemToCurriculum: (
    curriculumId: string,
    itemId: string,
    classification: "core" | "optional",
  ) => AcademicActionResult;
  removeItemFromCurriculum: (
    curriculumId: string,
    itemId: string,
  ) => AcademicActionResult;
  reorderCurriculumItem: (
    curriculumId: string,
    itemId: string,
    dir: -1 | 1,
  ) => AcademicActionResult;
  updateCurriculumItem: (
    curriculumId: string,
    itemId: string,
    patch: Partial<
      Pick<
        Curriculum["items"][number],
        "classification" | "chartLabel" | "periodsPerWeek" | "examPapers"
      >
    >,
  ) => AcademicActionResult;
  publishCurriculum: (curriculumId: string) => AcademicActionResult;
  /* combinations */
  saveCombination: (
    draft: Omit<SubjectCombination, "id"> & { id?: string },
  ) => AcademicActionResult;
  removeCombination: (id: string) => AcademicActionResult;
  /* allocation */
  adoptCurriculum: (
    classId: string,
    academicYear: string,
    curriculumId: string,
  ) => AcademicActionResult;
  bulkAdoptCurriculum: (
    classIds: string[],
    academicYear: string,
    curriculumId: string,
  ) => AcademicActionResult;
  publishAdoption: (classId: string, academicYear: string) => AcademicActionResult;
  removeFromAdoption: (
    classId: string,
    academicYear: string,
    itemId: string,
  ) => AcademicActionResult;
  setAssessmentOverride: (
    classId: string,
    itemId: string,
    config: { caMarks: number; examMarks: number },
  ) => AcademicActionResult;
  clearAssessmentOverride: (classId: string, itemId: string) => AcademicActionResult;
  setRegistrationMode: (classId: string, year: string, mode: RegistrationMode) => AcademicActionResult;
  /* teacher allocation */
  assignTeacher: (
    draft: Omit<TeacherItemAssignment, "id" | "assignedAt" | "endsAt" | "status"> & {
      status?: TeacherItemAssignment["status"];
    },
  ) => AcademicActionResult;
  unassignTeacher: (assignmentId: string) => AcademicActionResult;
  /* student registration */
  registerStudentSubjects: (
    studentId: string,
    classId: string,
    optionalItemIds: string[],
    opts?: { combinationId?: string | null; source?: StudentSubjectRegistration["source"] },
  ) => AcademicActionResult;
  dropRegistration: (registrationId: string) => AcademicActionResult;
  bulkRegisterClass: (
    classId: string,
    year: string,
    opts?: { combinationIdByStudent?: Record<string, string | null> },
  ) => AcademicActionResult & { registered?: number };
  resetToSeed: () => void;
}

const seed = buildSeedAcademicState();

export const useAcademicAdminStore = create<AcademicAdminState>()(
  persist(
    (set, get) => ({
      ...seed,

      resetToSeed: () => set({ ...seed, audit: [...seed.audit] }),

      /* ── catalogue ─────────────────────────────────────────────── */
      registerItem: (draft) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const errors = validateItem(data, draft);
        if (errors.length > 0) return { ok: false, error: errors.join(" ") };
        const now = new Date().toISOString();
        const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const item: AcademicItem = { ...draft, id, createdAt: now, updatedAt: now };
        set((s) => ({
          items: [...s.items, item],
          audit: [...s.audit, audit(s, "register-item", "academic_item", id, `${item.name} (${item.code}) registered`)],
        }));
        return { ok: true };
      },

      updateItem: (id, patch) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const existing = itemById(data, id);
        if (!existing) return { ok: false, error: "Item not found." };
        const merged = { ...existing, ...patch };
        const errors = validateItem(
          data,
          {
            name: merged.name,
            code: merged.code,
            type: merged.type,
            sections: merged.sections,
            category: merged.category,
          },
          id,
        );
        if (errors.length > 0) return { ok: false, error: errors.join(" ") };
        const now = new Date().toISOString();
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, ...patch, updatedAt: now } : i,
          ),
          audit: [...s.audit, audit(s, "update-item", "academic_item", id, `${merged.name} updated`)],
        }));
        return { ok: true };
      },

      archiveItem: (id) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const item = itemById(get(), id);
        if (!item) return { ok: false, error: "Item not found." };
        const nextStatus = item.status === "active" ? "inactive" : "active";
        // Business rule (task §4): archiving is always allowed; an inactive
        // item cannot be ADDED to new curricula, historical records stay.
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id ? { ...i, status: nextStatus, updatedAt: new Date().toISOString() } : i,
          ),
          audit: [
            ...s.audit,
            audit(
              s,
              nextStatus === "inactive" ? "archive-item" : "restore-item",
              "academic_item",
              id,
              `${item.name} ${nextStatus === "inactive" ? "archived" : "restored"}`,
            ),
          ],
        }));
        return { ok: true };
      },

      /* ── curricula ─────────────────────────────────────────────── */
      createCurriculum: (draft) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const clash = data.curricula.find(
          (c) =>
            c.section === draft.section &&
            c.level === draft.level &&
            c.academicYear === draft.academicYear,
        );
        if (clash)
          return {
            ok: false,
            error: `A ${draft.section} curriculum for ${draft.level} (${draft.academicYear}) already exists.`,
          };
        const id = `cur-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const curriculum: Curriculum = {
          ...draft,
          id,
          items: [],
          version: 1,
          status: "draft",
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({
          curricula: [...s.curricula, curriculum],
          audit: [...s.audit, audit(s, "create-curriculum", "curriculum", id, `${curriculum.name} created`)],
        }));
        return { ok: true, curriculumId: id };
      },

      addItemToCurriculum: (curriculumId, itemId, classification) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const curriculum = data.curricula.find((c) => c.id === curriculumId);
        const item = itemById(data, itemId);
        if (!curriculum || !item) return { ok: false, error: "Curriculum or item not found." };
        if (curriculum.items.some((ci) => ci.itemId === itemId))
          return { ok: false, error: `${item.name} is already in this curriculum.` };
        if (item.status === "inactive")
          return { ok: false, error: `${item.name} is archived and cannot be added to a new curriculum.` };
        if (!item.sections.includes(curriculum.section))
          return {
            ok: false,
            error: `${item.name} is not offered for the ${curriculum.section} section.`,
          };
        set((s) => ({
          curricula: s.curricula.map((c) =>
            c.id === curriculumId
              ? {
                  ...c,
                  version: c.version + 1,
                  status: "draft",
                  updatedAt: new Date().toISOString(),
                  items: [
                    ...c.items,
                    {
                      itemId,
                      classification,
                      order: c.items.length + 1,
                      periodsPerWeek: 3,
                      examPapers: 1 as const,
                      chartLabel: item.code.slice(0, 8),
                      assessment: {
                        caMarks: 25,
                        examMarks: 75,
                        fullMarks: 100,
                        developmentalModel:
                          c.section === "Early Years"
                            ? ["Emerging", "Developing", "Achieved", "Exceeding Expectations"]
                            : null,
                      },
                    },
                  ],
                }
              : c,
          ),
          audit: [...s.audit, audit(s, "add-curriculum-item", "curriculum", curriculumId, `${item.name} added as ${classification}`)],
        }));
        return { ok: true };
      },

      removeItemFromCurriculum: (curriculumId, itemId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const curriculum = data.curricula.find((c) => c.id === curriculumId);
        const item = itemById(data, itemId);
        if (!curriculum || !item) return { ok: false, error: "Curriculum or item not found." };
        // Guard: refuse when the item has registration / assignment history in
        // classes that adopted this curriculum (task §4 deletion restriction).
        const adoptingClasses = Object.values(data.adoptions)
          .filter((a) => a.curriculumId === curriculumId)
          .map((a) => a.classId);
        for (const classId of adoptingClasses) {
          if (itemHasHistory(data, itemId, classId))
            return {
              ok: false,
              error: `${item.name} has registration or teacher history in an adopting class — remove it from the class allocation instead.`,
            };
        }
        set((s) => ({
          curricula: s.curricula.map((c) =>
            c.id === curriculumId
              ? {
                  ...c,
                  version: c.version + 1,
                  status: "draft",
                  updatedAt: new Date().toISOString(),
                  items: c.items
                    .filter((ci) => ci.itemId !== itemId)
                    .map((ci, i) => ({ ...ci, order: i + 1 })),
                }
              : c,
          ),
          audit: [...s.audit, audit(s, "remove-curriculum-item", "curriculum", curriculumId, `${item.name} removed`)],
        }));
        return { ok: true };
      },

      reorderCurriculumItem: (curriculumId, itemId, dir) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        set((s) => ({
          curricula: s.curricula.map((c) => {
            if (c.id !== curriculumId) return c;
            const items = [...c.items].sort((a, b) => a.order - b.order);
            const idx = items.findIndex((ci) => ci.itemId === itemId);
            const target = idx + dir;
            if (idx < 0 || target < 0 || target >= items.length) return c;
            [items[idx], items[target]] = [items[target], items[idx]];
            return {
              ...c,
              version: c.version + 1,
              updatedAt: new Date().toISOString(),
              items: items.map((ci, i) => ({ ...ci, order: i + 1 })),
            };
          }),
        }));
        return { ok: true };
      },

      updateCurriculumItem: (curriculumId, itemId, patch) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        set((s) => ({
          curricula: s.curricula.map((c) =>
            c.id === curriculumId
              ? {
                  ...c,
                  version: c.version + 1,
                  updatedAt: new Date().toISOString(),
                  items: c.items.map((ci) =>
                    ci.itemId === itemId ? { ...ci, ...patch } : ci,
                  ),
                }
              : c,
          ),
        }));
        return { ok: true };
      },

      publishCurriculum: (curriculumId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const curriculum = get().curricula.find((c) => c.id === curriculumId);
        if (!curriculum) return { ok: false, error: "Curriculum not found." };
        if (curriculum.items.length === 0)
          return { ok: false, error: "Add at least one item before publishing." };
        set((s) => ({
          curricula: s.curricula.map((c) =>
            c.id === curriculumId
              ? { ...c, status: "published", updatedAt: new Date().toISOString() }
              : c,
          ),
          audit: [...s.audit, audit(s, "publish-curriculum", "curriculum", curriculumId, `${curriculum.name} published (v${curriculum.version + 1})`)],
        }));
        return { ok: true };
      },

      /* ── combinations ──────────────────────────────────────────── */
      saveCombination: (draft) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        if (!draft.name.trim() || !draft.code.trim())
          return { ok: false, error: "Combination name and code are required." };
        if (draft.itemIds.length === 0)
          return { ok: false, error: "Add at least one optional subject." };
        set((s) => {
          if (draft.id && s.combinations.some((c) => c.id === draft.id)) {
            return {
              combinations: s.combinations.map((c) =>
                c.id === draft.id ? { ...c, ...draft, id: c.id } : c,
              ),
              audit: [...s.audit, audit(s, "update-combination", "combination", draft.id, `${draft.name} updated`)],
            };
          }
          const id = `combo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          return {
            combinations: [...s.combinations, { ...draft, id }],
            audit: [...s.audit, audit(s, "create-combination", "combination", id, `${draft.name} created`)],
          };
        });
        return { ok: true };
      },

      removeCombination: (id) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const inUse = get().registrations.some(
          (r) => r.combinationId === id && r.status === "active",
        );
        if (inUse)
          return { ok: false, error: "Students are registered through this combination — reassign them first." };
        set((s) => ({
          combinations: s.combinations.filter((c) => c.id !== id),
          audit: [...s.audit, audit(s, "remove-combination", "combination", id, "removed")],
        }));
        return { ok: true };
      },

      /* ── class allocation ──────────────────────────────────────── */
      adoptCurriculum: (classId, academicYear, curriculumId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const curriculum = get().curricula.find((c) => c.id === curriculumId);
        if (!curriculum) return { ok: false, error: "Curriculum not found." };
        const adoption: ClassCurriculumAdoption = {
          classId,
          academicYear,
          curriculumId,
          status: "draft",
          publishedAt: null,
        };
        set((s) => ({
          adoptions: { ...s.adoptions, [adoptionKey(classId, academicYear)]: adoption },
          audit: [...s.audit, audit(s, "adopt-curriculum", "class_curriculum", adoptionKey(classId, academicYear), `${classId} adopted ${curriculum.name}`)],
        }));
        return { ok: true };
      },

      bulkAdoptCurriculum: (classIds, academicYear, curriculumId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const curriculum = get().curricula.find((c) => c.id === curriculumId);
        if (!curriculum) return { ok: false, error: "Curriculum not found." };
        set((s) => {
          const adoptions = { ...s.adoptions };
          for (const classId of classIds)
            adoptions[adoptionKey(classId, academicYear)] = {
              classId,
              academicYear,
              curriculumId,
              status: "draft",
              publishedAt: null,
            };
          return {
            adoptions,
            audit: [
              ...s.audit,
              audit(
                s,
                "bulk-adopt-curriculum",
                "class_curriculum",
                curriculumId,
                `${classIds.length} classes adopted ${curriculum.name}`,
              ),
            ],
          };
        });
        return { ok: true };
      },

      publishAdoption: (classId, academicYear) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const key = adoptionKey(classId, academicYear);
        const adoption = get().adoptions[key];
        if (!adoption) return { ok: false, error: "The class has no adopted curriculum." };
        set((s) => ({
          adoptions: {
            ...s.adoptions,
            [key]: { ...adoption, status: "published", publishedAt: new Date().toISOString() },
          },
          audit: [...s.audit, audit(s, "publish-allocation", "class_curriculum", key, `${classId} allocation published`)],
        }));
        return { ok: true };
      },

      removeFromAdoption: (classId, academicYear, itemId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        if (itemHasHistory(data, itemId, classId))
          return {
            ok: false,
            error: "This item has registration or teacher history in the class — drop the registrations first.",
          };
        const key = adoptionKey(classId, academicYear);
        const adoption = data.adoptions[key];
        if (!adoption) return { ok: false, error: "The class has no adopted curriculum." };
        set((s) => {
          const curriculum = s.curricula.find((c) => c.id === adoption.curriculumId);
          if (!curriculum) return {};
          return {
            curricula: s.curricula.map((c) =>
              c.id === curriculum.id
                ? {
                    ...c,
                    version: c.version + 1,
                    updatedAt: new Date().toISOString(),
                    items: c.items
                      .filter((ci) => ci.itemId !== itemId)
                      .map((ci, i) => ({ ...ci, order: i + 1 })),
                  }
                : c,
            ),
            audit: [
              ...s.audit,
              audit(
                s,
                "remove-allocation-item",
                "class_curriculum",
                key,
                `${itemById(data, itemId)?.name ?? itemId} removed from ${classId}`,
              ),
            ],
          };
        });
        return { ok: true };
      },

      setAssessmentOverride: (classId, itemId, config) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        if (config.caMarks + config.examMarks <= 0)
          return { ok: false, error: "CA + Exam marks must add up to more than 0." };
        set((s) => ({
          assessmentOverrides: {
            ...s.assessmentOverrides,
            [assessmentKey(classId, itemId)]: {
              caMarks: config.caMarks,
              examMarks: config.examMarks,
              fullMarks: config.caMarks + config.examMarks,
            },
          },
          audit: [
            ...s.audit,
            audit(
              s,
              "configure-assessment",
              "assessment_configuration",
              assessmentKey(classId, itemId),
              `CA ${config.caMarks} + Exam ${config.examMarks} = ${config.caMarks + config.examMarks}`,
            ),
          ],
        }));
        return { ok: true };
      },

      clearAssessmentOverride: (classId, itemId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        set((s) => {
          const overrides = { ...s.assessmentOverrides };
          delete overrides[assessmentKey(classId, itemId)];
          return { assessmentOverrides: overrides };
        });
        return { ok: true };
      },

      setRegistrationMode: (classId, year, mode) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        set((s) => ({
          registrationModes: { ...s.registrationModes, [adoptionKey(classId, year)]: mode },
          audit: [...s.audit, audit(s, "set-registration-mode", "registration_mode", adoptionKey(classId, year), mode)],
        }));
        return { ok: true };
      },

      /* ── teacher allocation ────────────────────────────────────── */
      assignTeacher: (draft) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const duplicate = data.assignments.find(
          (a) =>
            a.classId === draft.classId &&
            a.itemId === draft.itemId &&
            a.teacherId === draft.teacherId &&
            a.status === "assigned" &&
            a.endsAt === null &&
            a.academicYear === draft.academicYear,
        );
        if (duplicate)
          return { ok: false, error: "Duplicate assignment: this teacher already holds this class subject." };
        const now = new Date().toISOString();
        // Reassignment history: end the previous active assignment, keep the row.
        const previous = data.assignments.find(
          (a) =>
            a.classId === draft.classId &&
            a.itemId === draft.itemId &&
            a.status === "assigned" &&
            a.endsAt === null &&
            a.academicYear === draft.academicYear,
        );
        const row: TeacherItemAssignment = {
          ...draft,
          id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: draft.status ?? "assigned",
          assignedAt: now,
          endsAt: null,
        };
        set((s) => ({
          assignments: [
            ...s.assignments.map((a) =>
              previous && a.id === previous.id ? { ...a, endsAt: now } : a,
            ),
            row,
          ],
          audit: [
            ...s.audit,
            audit(
              s,
              "assign-teacher",
              "teacher_assignment",
              row.id,
              `${row.teacherId} → ${row.classId} · ${itemById(data, row.itemId)?.name ?? row.itemId}`,
            ),
          ],
        }));
        return { ok: true };
      },

      unassignTeacher: (assignmentId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const row = get().assignments.find((a) => a.id === assignmentId);
        if (!row) return { ok: false, error: "Assignment not found." };
        set((s) => ({
          assignments: s.assignments.map((a) =>
            a.id === assignmentId ? { ...a, endsAt: new Date().toISOString() } : a,
          ),
          audit: [...s.audit, audit(s, "unassign-teacher", "teacher_assignment", assignmentId, `${row.teacherId} released from ${row.classId}`)],
        }));
        return { ok: true };
      },

      /* ── student registration ──────────────────────────────────── */
      registerStudentSubjects: (studentId, classId, optionalItemIds, opts) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const year = "2026";
        const validation = validateRegistration(
          data,
          studentId,
          classId,
          optionalItemIds,
          opts?.combinationId ?? null,
          year,
        );
        if (validation.errors.length > 0)
          return { ok: false, error: validation.errors.join(" ") };
        const now = new Date().toISOString();
        const rows: StudentSubjectRegistration[] = optionalItemIds.map((itemId) => ({
          id: `reg-${classId}-${studentId}-${itemId}`,
          studentId,
          classId,
          itemId,
          academicYear: year,
          classification: "optional" as const,
          source: opts?.source ?? "individual",
          combinationId: opts?.combinationId ?? null,
          status: "active" as const,
          registeredAt: now,
          droppedAt: null,
        }));
        set((s) => ({
          registrations: [
            ...s.registrations.filter(
              (r) => !rows.some((row) => row.id === r.id),
            ),
            ...rows,
          ],
          audit: [
            ...s.audit,
            audit(
              s,
              "register-subjects",
              "student_registration",
              `${classId}|${studentId}`,
              `${rows.length} optional subject(s) registered${opts?.combinationId ? ` via ${opts.combinationId}` : ""}`,
            ),
          ],
        }));
        return { ok: true };
      },

      dropRegistration: (registrationId) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const row = get().registrations.find((r) => r.id === registrationId);
        if (!row) return { ok: false, error: "Registration not found." };
        set((s) => ({
          registrations: s.registrations.map((r) =>
            r.id === registrationId
              ? { ...r, status: "dropped", droppedAt: new Date().toISOString() }
              : r,
          ),
          audit: [
            ...s.audit,
            audit(
              s,
              "drop-registration",
              "student_registration",
              registrationId,
              `${row.itemId} dropped for ${row.studentId} (history kept)`,
            ),
          ],
        }));
        return { ok: true };
      },

      bulkRegisterClass: (classId, year, opts) => {
        const denied = guard();
        if (denied) return { ok: false, error: denied };
        const data = get();
        const { adoptedCurriculum, studentsInClassOf } = bulkHelpers(data, classId, year);
        if (!adoptedCurriculum) return { ok: false, error: "The class has no adopted curriculum." };
        const now = new Date().toISOString();
        const rows: StudentSubjectRegistration[] = [];
        for (const student of studentsInClassOf) {
          for (const ci of adoptedCurriculum.items) {
            if (ci.classification === "core") {
              rows.push({
                id: `reg-${classId}-${student.id}-${ci.itemId}`,
                studentId: student.id,
                classId,
                itemId: ci.itemId,
                academicYear: year,
                classification: "core",
                source: "auto-core",
                combinationId: null,
                status: "active",
                registeredAt: now,
                droppedAt: null,
              });
            }
          }
          const combinationId = opts?.combinationIdByStudent?.[student.id] ?? null;
          if (combinationId) {
            const combo = data.combinations.find((c) => c.id === combinationId);
            if (!combo) return { ok: false, error: "Selected combination not found." };
            for (const itemId of combo.itemIds) {
              rows.push({
                id: `reg-${classId}-${student.id}-${itemId}`,
                studentId: student.id,
                classId,
                itemId,
                academicYear: year,
                classification: "optional",
                source: "combination",
                combinationId,
                status: "active",
                registeredAt: now,
                droppedAt: null,
              });
            }
          }
        }
        set((s) => ({
          registrations: [
            ...s.registrations.filter((r) => !rows.some((row) => row.id === r.id)),
            ...rows,
          ],
          audit: [
            ...s.audit,
            audit(
              s,
              "bulk-register",
              "student_registration",
              adoptionKey(classId, year),
              `${rows.length} registration rows upserted for ${classId}`,
            ),
          ],
        }));
        return { ok: true, registered: rows.length };
      },
    }),
    {
      name: "josephian-academic-admin",
      skipHydration: true,
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(typeof persisted === "object" && persisted ? persisted : {}),
        } as AcademicAdminState;
        if (merged.seedVersion !== ACADEMIC_SEED_VERSION || !Array.isArray(merged.items)) {
          return { ...current, audit: current.audit };
        }
        return merged;
      },
    },
  ),
);

/* Bulk helper: resolve the adopted curriculum + the class's students. */
function bulkHelpers(data: AcademicAdminData, classId: string, year: string) {
  const curriculum = data.curricula.find(
    (c) => c.id === data.adoptions[adoptionKey(classId, year)]?.curriculumId,
  );
  return { adoptedCurriculum: curriculum, studentsInClassOf: studentsInClass(classId) };
}

/* ----------------------------------------------------------------
 * Role-aware access helpers for marks entry (task §12). They read the
 * academic store non-reactively (actions/entry guards run after mount
 * hydration) and delegate to the pure helpers in academic-admin.ts.
 * ---------------------------------------------------------------- */

export function assignedSubjectIdsForClass(
  viewer: { role: string; teacherId: string | null },
  classId: string,
): string[] {
  const s = useAcademicAdminStore.getState();
  return effectiveAssignedSubjectIds(s, viewer, classId);
}

export function canEditSubject(
  viewer: { role: string; teacherId: string | null },
  classId: string,
  subjectId: string,
): boolean {
  return assignedSubjectIdsForClass(viewer, classId).includes(subjectId);
}

/** Effective class subjects as a reactive hook (report cards, analysis). */
export function useEffectiveClassSubjects(classId: string): ClassSubject[] {
  useEffect(() => {
    void useAcademicAdminStore.persist.rehydrate();
  }, []);
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const assessmentOverrides = useAcademicAdminStore((s) => s.assessmentOverrides);
  return useMemo(
    () => effectiveClassSubjectsFor({ curricula, adoptions, assignments, assessmentOverrides }, classId),
    [curricula, adoptions, assignments, assessmentOverrides, classId],
  );
}

/** The student's actively registered item ids (null = no records yet). */
export function useRegisteredItemIds(
  classId: string,
  studentId: string,
): string[] | null {
  useEffect(() => {
    void useAcademicAdminStore.persist.rehydrate();
  }, []);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  return useMemo(
    () => registeredItemIdsForStudent({ registrations }, classId, studentId),
    [registrations, classId, studentId],
  );
}

/**
 * Classes the viewer may open (task §7): masters/administrators see every
 * class; a subject teacher sees only classes where they hold an ACTIVE
 * teacher assignment (derived from the academic store, so reassignments on
 * the Teacher Allocation page apply immediately). Classes without any
 * assignment rows fall back to the legacy demo derivation inside
 * effectiveAssignedSubjectIds, keeping the app usable if config is reset.
 */
export function useVisibleClassesForViewer(viewer: {
  role: string;
  teacherId: string | null;
}): ClassRoom[] {
  useEffect(() => {
    void useAcademicAdminStore.persist.rehydrate();
  }, []);
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const assessmentOverrides = useAcademicAdminStore((s) => s.assessmentOverrides);
  return useMemo(() => {
    if (viewer.role !== "subject-teacher" || !viewer.teacherId) return classes;
    return classes.filter(
      (c) =>
        effectiveAssignedSubjectIds(
          { curricula, adoptions, assignments, assessmentOverrides },
          viewer,
          c.id,
        ).length > 0,
    );
  }, [viewer, curricula, adoptions, assignments, assessmentOverrides]);
}

/** Mount-time rehydration hook (prevents SSR/client hydration mismatches). */
export function useAcademicAdmin() {
  const state = useAcademicAdminStore();
  useEffect(() => {
    void useAcademicAdminStore.persist.rehydrate();
  }, []);
  return state;
}
