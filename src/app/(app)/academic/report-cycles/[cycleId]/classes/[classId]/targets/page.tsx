"use client";

import { Suspense } from "react";
import { ResultsTargetsHost } from "@/components/features/results-targets/results-targets-host";

/**
 * Thin wrapper preserving the original next-term targets route. Renders the
 * merged Results & targets host on the targets tab.
 */
export default function ClassTargetsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsTargetsHost initialTab="targets" />
    </Suspense>
  );
}
