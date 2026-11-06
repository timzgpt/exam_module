"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { teacherById, teachers } from "./demo-data";
import type { Teacher } from "./types";

/**
 * Viewer / role model for the app (task §4/§13). The app has no auth backend
 * yet, so the "current user" is a persisted demo viewer the UI scopes access
 * against. Subject access itself (assignedSubjectIdsForClass / canEditSubject /
 * useVisibleClassesForViewer) is DERIVED from the academic store's active
 * teacher assignments — this module only owns the identity + role switcher.
 * In a real deployment this is replaced by the authenticated session and the
 * same guards run on the server before any write.
 *
 *   subject-teacher  — sees and edits ONLY their assigned subjects/classes
 *   academic-master  — sees every subject; monitors and approves (demo: can edit)
 *   administrator    — configures structure via the existing admin pages
 */

export type ViewerRole = "academic-master" | "subject-teacher" | "administrator";

export interface Viewer {
  role: ViewerRole;
  /** Set only when role === "subject-teacher": which teacher is signed in. */
  teacherId: string | null;
}

interface ViewerState extends Viewer {
  setViewer: (role: ViewerRole, teacherId?: string | null) => void;
}

export const useViewer = create<ViewerState>()(
  persist(
    (set) => ({
      role: "academic-master",
      teacherId: null,
      setViewer: (role, teacherId = null) =>
        set({ role, teacherId: role === "subject-teacher" ? teacherId : null }),
    }),
    {
      name: "josephian-viewer",
      skipHydration: true,
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(typeof persisted === "object" && persisted ? persisted : {}),
        } as ViewerState;
        if (merged.role !== "subject-teacher") merged.teacherId = null;
        return merged;
      },
    },
  ),
);

/** A subject-teacher viewer is scoped; masters and admins see everything. */
function isScoped(v: Viewer): v is Viewer & { teacherId: string } {
  return v.role === "subject-teacher" && !!v.teacherId;
}

/** Label for the signed-in viewer (header / filter panel). */
export function viewerLabel(v: Viewer): string {
  if (isScoped(v)) return `${teacherById(v.teacherId)?.name ?? "Teacher"} · Subject Teacher`;
  if (v.role === "administrator") return "Administrator";
  return "Academic Master";
}

/** Teachers assignable as the signed-in subject teacher (have ≥1 subject). */
export function subjectTeachers(): Teacher[] {
  return teachers.filter((t) => t.subjectIds.length > 0);
}
