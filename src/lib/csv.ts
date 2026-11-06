/**
 * Shared CSV download. Single source for the Blob + synthetic-anchor export
 * pattern that was previously duplicated across four pages (consolidation
 * review, Table 1 row 4).
 */

/** Build a CSV document from rows (first row may be a header) and trigger a download. */
export function downloadCsv(rows: string[][], filename: string): void {
  const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
