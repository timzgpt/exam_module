"use client";

import { Suspense } from "react";
import { ParentReportsHub } from "@/components/features/parent-reports/parent-reports-hub";

/**
 * Thin wrapper preserving the original /portal/report-cards/on-hold route
 * (deep links from messages and letters keep working). The hub shows the
 * hold explanation in place of the card whenever the selected child's card
 * is held, and a confirmation otherwise.
 */
export default function PortalOnHoldPage() {
  return (
    <Suspense fallback={null}>
      <ParentReportsHub initialTab="card" />
    </Suspense>
  );
}
