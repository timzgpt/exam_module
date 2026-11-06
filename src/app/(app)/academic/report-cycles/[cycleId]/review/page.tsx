"use client";

import { Suspense } from "react";
import { ApprovalsReleaseHost } from "@/components/features/approvals-release/approvals-release-host";

/**
 * Thin wrapper preserving the original /review route. Renders the merged
 * Approvals & release host with the approvals pipeline preselected.
 */
export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ApprovalsReleaseHost initialTab="approvals" />
    </Suspense>
  );
}
