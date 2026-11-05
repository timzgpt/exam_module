"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_IDS } from "./demo-config";

/**
 * Contextual selection store. The sidebar and header build class- and
 * cycle-specific links from this context, while every page reads its ids
 * from the URL parameters. Replacing demo ids with real backend ids later
 * only requires changing `demo-config.ts`.
 */
interface AppState {
  cycleId: string;
  classId: string;
  studentId: string;
  setCycle: (id: string) => void;
  setClass: (id: string) => void;
  setStudent: (id: string) => void;
}

export const useAppContext = create<AppState>()(
  persist(
    (set) => ({
      cycleId: DEMO_IDS.reportCycleId,
      classId: DEMO_IDS.classId,
      studentId: DEMO_IDS.studentId,
      setCycle: (id) => set({ cycleId: id }),
      setClass: (id) => set({ classId: id }),
      setStudent: (id) => set({ studentId: id }),
    }),
    {
      name: "josephian-context",
      // Rehydrate after mount (see AppShell) so server-rendered markup always
      // matches the first client render: avoids hydration mismatches.
      skipHydration: true,
    },
  ),
);

export function useNavContext() {
  const { cycleId, classId, studentId } = useAppContext();
  return { cycleId, classId, studentId };
}
