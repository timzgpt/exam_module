import type { BadgeTone } from "@/components/shared/status-badge";

/**
 * Unified marks-submission classifier. Previously each page implemented its
 * own variant with identical thresholds but different names and labels
 * (consolidation review, Table 1 rows 7 and 8).
 */

export type SubmissionState = "complete" | "partial" | "overdue";

/** Complete when every entry is in, Partial when some are, Overdue when none. */
export function submissionState(done: number, total: number): SubmissionState {
  if (total > 0 && done >= total) return "complete";
  if (done > 0) return "partial";
  return "overdue";
}

export function submissionTone(state: SubmissionState): BadgeTone {
  switch (state) {
    case "complete":
      return "success";
    case "partial":
      return "warning";
    default:
      return "destructive";
  }
}

export function submissionLabel(state: SubmissionState): string {
  switch (state) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    default:
      return "Overdue";
  }
}
