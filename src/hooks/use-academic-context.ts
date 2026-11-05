"use client";

import { useParams } from "next/navigation";
import { DEMO_IDS } from "@/lib/demo-config";
import { classById, currentCycle } from "@/lib/demo-data";
import { resolveCycle, useAppContext } from "@/lib/store";
import type { ClassRoom, ReportCycle } from "@/lib/types";

/**
 * Route-parameter context hooks. The resolution expressions below were
 * previously copy-pasted into fourteen cycle pages and five class pages
 * (consolidation review, Table 1 rows 1 and 2). Pages read their ids from
 * the URL and fall back to the central demo configuration, so deep links
 * and refreshes keep working for any id.
 */

/** Cycle context for pages under /academic/report-cycles/[cycleId]/... */
export function useCycleContext(): { cycleId: string; cycle: ReportCycle } {
  const params = useParams<{ cycleId?: string }>();
  const cycleId = params?.cycleId ?? DEMO_IDS.reportCycleId;
  // Cycles created through the "New report cycle" dialog live in the
  // context store (persisted), so their marks / dashboard / card routes
  // resolve exactly like the built-in demo cycles — and Edit/Delete on the
  // cycles page applies here too (overridden rows, tombstoned deletions).
  const createdCycles = useAppContext((s) => s.createdCycles);
  const cycleOverrides = useAppContext((s) => s.cycleOverrides);
  const deletedCycleIds = useAppContext((s) => s.deletedCycleIds);
  const cycle =
    resolveCycle(cycleId, { createdCycles, cycleOverrides, deletedCycleIds }) ?? currentCycle;
  return { cycleId, cycle };
}

/** Class context for pages under .../classes/[classId]/... and /academic/classes/[classId]/... */
export function useClassContext(): { classId: string; klass: ClassRoom } {
  const params = useParams<{ classId?: string }>();
  const classId = params?.classId ?? DEMO_IDS.classId;
  const klass = classById(classId) ?? classById(DEMO_IDS.classId)!;
  return { classId, klass };
}
