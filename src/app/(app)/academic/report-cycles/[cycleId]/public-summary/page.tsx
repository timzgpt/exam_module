"use client";

import { Suspense } from "react";
import { CycleAnalyticsHost } from "@/components/features/cycle-analytics/cycle-analytics-host";

/**
 * Thin wrapper preserving the original /public-summary route. Renders the
 * merged Cycle analytics host with the public summary tab preselected.
 */
export default function PublicSummaryPage() {
  return (
    <Suspense fallback={null}>
      <CycleAnalyticsHost initialTab="public" />
    </Suspense>
  );
}
