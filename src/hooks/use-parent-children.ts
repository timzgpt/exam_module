"use client";

import { demoParent } from "@/lib/demo-data";
import type { Student } from "@/lib/types";

/**
 * The signed-in demo parent's children. Reads the central demoParent record
 * (previously unused) instead of the per-page hardcoded copies, and gives the
 * backend phase a single seam to replace with the real session parent.
 */
export function useParentChildren(): Student[] {
  return demoParent.children;
}
