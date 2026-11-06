"use client";

import { Suspense } from "react";
import { CycleReadinessHost } from "@/components/features/cycle-readiness/cycle-readiness-host";

/**
 * Thin wrapper preserving the original /readiness route. Renders the merged
 * Cycle readiness & deadlines host with the readiness gate preselected.
 */
export default function CycleReadinessPage() {
  return (
    <Suspense fallback={null}>
      <CycleReadinessHost initialTab="gate" />
    </Suspense>
  );
}
