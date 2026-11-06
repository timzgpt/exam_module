"use client";

import { Suspense } from "react";
import { CycleAnalyticsHost } from "@/components/features/cycle-analytics/cycle-analytics-host";

/**
 * Thin wrapper preserving the original /departments route. Renders the
 * merged Cycle analytics host with the HOD department view preselected.
 */
export default function DepartmentsPage() {
  return (
    <Suspense fallback={null}>
      <CycleAnalyticsHost initialTab="departments" />
    </Suspense>
  );
}
