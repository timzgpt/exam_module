"use client";

import { Suspense } from "react";
import { ParentReportsHub } from "@/components/features/parent-reports/parent-reports-hub";

/**
 * Thin wrapper preserving the original /portal/progress route. Renders the
 * merged parent reports hub on the progress & targets tab.
 */
export default function PortalProgressPage() {
  return (
    <Suspense fallback={null}>
      <ParentReportsHub initialTab="progress" />
    </Suspense>
  );
}
