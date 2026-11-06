/**
 * Shared chrome for the printable report-card tables (the school's
 * "totally white paper, bordered tables" design). The single accent colour
 * is the brand maroon #5C0A14 — the exact maroon of the Josephian Schools
 * shield — used for the title band and every table header row; all other
 * fills are white.
 *
 * The staff marks-based card and every Early Years template import these
 * constants so all cards print with one visual identity (task §7).
 */

export const BRAND = "#5C0A14";

/** Shared table class: full width, fixed layout, collapsed borders. */
export const TBL = "w-full table-fixed border-collapse";

/** Full-width maroon section bar (first row of each section table). */
export const SECTION_BAR =
  "border border-border bg-[#5C0A14] px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-white";

/** Maroon column-heading cell. */
export const COL_HEAD =
  "border border-border bg-[#5C0A14] px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white";

/** Standard bordered body cell (white). */
export const CELL = "border border-border bg-white px-2 py-1.5 align-middle";

/** Tiny uppercase label used inside bordered cells. */
export const CELL_LABEL =
  "text-3xs font-semibold uppercase tracking-[0.12em] text-muted-foreground";
