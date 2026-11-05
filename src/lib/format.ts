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

/** "2026-01-12", "2026-03-11" -> "12 January \u2013 11 March 2026" */
export function fmtDateRange(from: string, to: string): string {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  if (!fy || !fm || !fd || !ty || !tm || !td) return `${from} \u2013 ${to}`;
  const fromText = `${fd} ${MONTHS_LONG[fm - 1]}`;
  const toText = `${td} ${MONTHS_LONG[tm - 1]}`;
  return fy === ty
    ? `${fromText} \u2013 ${toText} ${ty}`
    : `${fromText} ${fy} \u2013 ${toText} ${ty}`;
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
