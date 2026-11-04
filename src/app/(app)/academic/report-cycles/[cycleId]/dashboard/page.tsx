"use client";

import { Suspense } from "react";
import { CycleAnalyticsHost } from "@/components/features/cycle-analytics/cycle-analytics-host";

/**
 * Thin wrapper preserving the original /dashboard route. Renders the merged
 * Cycle analytics host with the executive overview preselected.
 */
export default function CycleDashboardPage() {
  return (
    <Suspense fallback={null}>
      <CycleAnalyticsHost initialTab="overview" />
    </Suspense>
  );
}
