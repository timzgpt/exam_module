"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DEMO_IDS } from "@/lib/demo-config";
import {
  bookingSlots,
  classes,
  parentsDayEvent,
  studentById,
  teacherById,
} from "@/lib/demo-data";
import type { BookingSlot, Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import { useState } from "react";

/* ---- Demo parent context ------------------------------------------------ */

const children: Student[] = [
  studentById(DEMO_IDS.studentId),
  studentById("f1b-04"),
].filter((s): s is Student => Boolean(s));

const firstName = (name: string) => name.split(" ")[0];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

/** The six class teachers, with the class they lead. */
const teacherOptions = classes.flatMap((cls) => {
  const teacher = teacherById(cls.classTeacherId);
  return teacher ? [{ teacher, className: cls.name }] : [];
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-03-27" -> "27 March 2026" */
function fmtLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "09:00 - 09:20" → "09:00" (start of the slot window). */
function slotStart(label: string): string {
  return label.split("-")[0].trim();
}

/* ---- Child selector chips (mobile: horizontal scroll) ------------------- */

function ChildChips({
  kids,
  selectedId,
  onSelect,
}: {
  kids: Student[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Select a child">
      {kids.map((kid) => {
        const active = kid.id === selectedId;
        return (
          <button
            key={kid.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kid.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border px-3 py-1.5 text-left transition-colors",
              active ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {initialsOf(kid.name)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className={cn("text-compact font-medium", active ? "text-primary" : "text-foreground")}>
                {firstName(kid.name)}
              </span>
              <span className="text-2xs text-muted-foreground">
                Bookings for {firstName(kid.name)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Page ---------------------------------------------------------------- */

export default function PortalParentsDayPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDS.studentId);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    teacherOptions[0]?.teacher.id ?? "",
  );
  const [slots, setSlots] = useState<BookingSlot[]>(bookingSlots);
  const [bookTarget, setBookTarget] = useState<BookingSlot | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingSlot | null>(null);

  const child = children.find((c) => c.id === selectedId) ?? children[0];
  const selectedOption =
    teacherOptions.find((t) => t.teacher.id === selectedTeacherId) ?? teacherOptions[0];
  if (!child || !selectedOption) return null;

  const teacherSlots = slots.filter((s) => s.teacherId === selectedOption.teacher.id);
  const appointments = slots
    .filter((s) => s.bookedByStudentId === child.id)
    .slice()
    .sort((a, b) => a.slot.localeCompare(b.slot));

  const confirmBooking = (slot: BookingSlot) => {
    const start = slotStart(slot.slot);
    const conflict = slots.some(
      (s) =>
        s.bookedByStudentId === child.id &&
        s.teacherId !== slot.teacherId &&
        slotStart(s.slot) === start,
    );
    if (conflict) {
      toast({
        variant: "destructive",
        title: "Booking conflict",
        description: `Conflict: ${firstName(child.name)} already has a booking at ${start}. Cancel that appointment first or pick another time.`,
      });
    } else {
      setSlots((prev) =>
        prev.map((s) => (s.id === slot.id ? { ...s, bookedByStudentId: child.id } : s)),
      );
      toast({
        title: "Appointment booked",
        description: `${slot.slot} with ${selectedOption.teacher.name} for ${firstName(child.name)}.`,
      });
    }
    setBookTarget(null);
  };

  const confirmCancel = (slot: BookingSlot) => {
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, bookedByStudentId: null } : s)));
    toast({
      title: "Booking cancelled",
      description: `${slot.slot} with ${teacherById(slot.teacherId)?.name ?? "the teacher"} is open again.`,
    });
    setCancelTarget(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Parents' day"
        description="Book a 20-minute meeting with your child's class teacher."
      />

      <ChildChips kids={children} selectedId={selectedId} onSelect={setSelectedId} />

      {/* Event info strip */}
      <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <CalendarDays className="size-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-compact font-medium text-foreground">
            Parents&apos; consultation day: {fmtLongDate(parentsDayEvent.date)},{" "}
            {parentsDayEvent.window}
          </p>
          <p className="text-xs text-muted-foreground">
            Choose a teacher below, then pick an open slot.
          </p>
        </div>
      </div>

      {/* Teacher select */}
      <div>
        <p className="text-compact font-medium text-foreground">Choose a teacher</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {teacherOptions.map(({ teacher, className }) => {
            const active = teacher.id === selectedTeacherId;
            return (
              <button
                key={teacher.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTeacherId(teacher.id)}
                className={cn(
                  "flex min-h-12 shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-2 text-left transition-colors",
                  active ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                    active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {teacher.initials}
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-compact font-medium text-foreground">{teacher.name}</span>
                  <span className="text-2xs text-muted-foreground">Class teacher · {className}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Slot grid for the chosen teacher */}
      <SectionCard
        title={`Slots with ${selectedOption.teacher.name}`}
        description={`${selectedOption.className} · ${fmtLongDate(parentsDayEvent.date)} · 20-minute meetings.`}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {teacherSlots.map((slot) => {
            const mine = slot.bookedByStudentId === child.id;
            const taken = slot.bookedByStudentId !== null && !mine;
            if (mine) {
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => setCancelTarget(slot)}
                  className="flex min-h-14 flex-col justify-center rounded-lg border border-primary bg-primary px-3 py-2 text-left transition-colors hover:bg-primary/90"
                >
                  <span className="text-compact font-medium tabular text-primary-foreground">
                    {slot.slot}
                  </span>
                  <span className="text-xs text-primary-foreground/80">
                    Booked · {firstName(child.name)}
                  </span>
                </button>
              );
            }
            if (taken) {
              return (
                <div
                  key={slot.id}
                  aria-disabled
                  className="flex min-h-14 flex-col justify-center rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2"
                >
                  <span className="text-compact font-medium tabular text-muted-foreground">
                    {slot.slot}
                  </span>
                  <span className="text-xs text-muted-foreground">Booked</span>
                </div>
              );
            }
            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => setBookTarget(slot)}
                className="flex min-h-14 flex-col justify-center rounded-lg border border-border bg-background px-3 py-2 text-left transition-colors hover:bg-accent"
              >
                <span className="text-compact font-medium tabular text-foreground">{slot.slot}</span>
                <span className="text-xs text-muted-foreground">Open</span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Slots marked &quot;Booked&quot; are taken by other parents. Tap a booked slot of yours to
          cancel it.
        </p>
      </SectionCard>

      {/* Your appointments */}
      <SectionCard title="Your appointments" description={`All booked meetings for ${firstName(child.name)}.`}>
        {appointments.length === 0 ? (
          <p className="text-compact text-muted-foreground">
            No appointments yet. Pick an open slot above.
          </p>
        ) : (
          <div className="divide-y divide-border/70">
            {appointments.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-compact font-medium text-foreground">
                    {teacherById(slot.teacherId)?.name ?? "Teacher"}
                  </p>
                  <p className="text-xs tabular text-muted-foreground">{slot.slot}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0"
                  onClick={() => setCancelTarget(slot)}
                >
                  Cancel
                </Button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Book confirmation */}
      <AlertDialog open={!!bookTarget} onOpenChange={(open) => !open && setBookTarget(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Book this slot?</AlertDialogTitle>
            <AlertDialogDescription>
              Book {bookTarget?.slot ?? "this time"} with {selectedOption.teacher.name} for{" "}
              {firstName(child.name)}? The meeting takes 20 minutes at the school.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => bookTarget && confirmBooking(bookTarget)}>
              Book appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              Cancel {firstName(child.name)}&apos;s meeting at {cancelTarget?.slot ?? "this time"}{" "}
              with{" "}
              {teacherById(cancelTarget?.teacherId ?? "")?.name ?? "the teacher"}? The slot opens
              again for other parents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => cancelTarget && confirmCancel(cancelTarget)}
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
