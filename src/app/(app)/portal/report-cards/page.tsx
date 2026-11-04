"use client";

import { Suspense } from "react";
import { ParentReportsHub } from "@/components/features/parent-reports/parent-reports-hub";

/**
 * Thin wrapper preserving the original /portal/report-cards route. Renders
 * the merged parent reports hub on the report card tab.
 */
export default function PortalReportCardsPage() {
  return (
    <Suspense fallback={null}>
      <ParentReportsHub initialTab="card" />
    </Suspense>
  );
}
