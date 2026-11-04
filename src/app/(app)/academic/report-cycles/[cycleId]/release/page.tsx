"use client";

import { Suspense } from "react";
import { ApprovalsReleaseHost } from "@/components/features/approvals-release/approvals-release-host";

/**
 * Thin wrapper preserving the original /release route. Renders the merged
 * Approvals & release host with the release and holds tab preselected.
 */
export default function ReleasePage() {
  return (
    <Suspense fallback={null}>
      <ApprovalsReleaseHost initialTab="release" />
    </Suspense>
  );
}
