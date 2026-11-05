/**
 * Shared formatting helpers. Single source for date, time and name formatting
 * that was previously duplicated across pages (see consolidation review,
 * Table 1 rows 12 and 3).
 */

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-27" -> "27 March 2026" */
export function fmtLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

/** "2026-01-24 08:00" -> "24 Jan 2026 08:00" */
export function fmtStamp(value: string): string {
  const [date, time] = value.split(" ");
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}${time ? ` ${time}` : ""}`;
}

/** "09:00 - 09:20" -> "09:00" (start of the slot window). */
export function slotStart(label: string): string {
  return label.split("-")[0].trim();
}

/** "Amina Joseph Mwakalinga" -> "Amina" */
export function firstName(name: string): string {
  return name.split(" ")[0];
}

/** "Amina Joseph Mwakalinga" -> "AJ" */
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
