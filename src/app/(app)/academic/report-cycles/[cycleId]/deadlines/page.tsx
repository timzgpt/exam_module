"use client";

import { Suspense } from "react";
import { CycleReadinessHost } from "@/components/features/cycle-readiness/cycle-readiness-host";

/**
 * Thin wrapper preserving the original /deadlines route. Renders the merged
 * Cycle readiness & deadlines host with the deadline tracker preselected.
 */
export default function CycleDeadlinesPage() {
  return (
    <Suspense fallback={null}>
      <CycleReadinessHost initialTab="tracker" />
    </Suspense>
  );
}
