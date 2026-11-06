"use client";

import { Suspense } from "react";
import { ResultsTargetsHost } from "@/components/features/results-targets/results-targets-host";

/**
 * Thin wrapper preserving the original class results route. Renders the
 * merged Results & targets host on the results analysis tab.
 */
export default function ClassResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsTargetsHost initialTab="results" />
    </Suspense>
  );
}
