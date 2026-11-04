import type { BookingSlot } from "@/lib/types";
import { slotStart } from "@/lib/format";

/**
 * Shared parents'-day booking rules. The conflict predicate was previously
 * duplicated in the staff scheduler and the parent booking page
 * (consolidation review, Table 1 row 11).
 */

/** Target describing the booking intent (a slot the student wants). */
type BookingIntent = Pick<BookingSlot, "teacherId" | "slot">;

/**
 * The conflicting appointment when booking `target` for `studentId`: an
 * existing booking for the same student at the same start time with a
 * different teacher. Undefined when the booking is conflict-free.
 */
export function findBookingConflict(
  slots: BookingSlot[],
  studentId: string,
  target: BookingIntent,
): BookingSlot | undefined {
  const start = slotStart(target.slot);
  return slots.find(
    (s) =>
      s.bookedByStudentId === studentId &&
      s.teacherId !== target.teacherId &&
      slotStart(s.slot) === start,
  );
}

/** True when booking `target` for `studentId` would clash with an existing appointment. */
export function hasBookingConflict(
  slots: BookingSlot[],
  studentId: string,
  target: BookingIntent,
): boolean {
  return findBookingConflict(slots, studentId, target) !== undefined;
}

/** All appointments booked by a student, chronological by slot label. */
export function appointmentsFor(slots: BookingSlot[], studentId: string): BookingSlot[] {
  return slots
    .filter((s) => s.bookedByStudentId === studentId)
    .slice()
    .sort((a, b) => a.slot.localeCompare(b.slot));
}
