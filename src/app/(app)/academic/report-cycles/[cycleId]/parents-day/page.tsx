"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useCycleContext } from "@/hooks/use-academic-context";
import { CalendarCheck, CalendarPlus, CalendarRange, Clock, Pencil, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  bookingSlots,
  classes,
  parentsDayEvent,
  studentById,
  studentsInClass,
  teacherById,
} from "@/lib/demo-data";
import { findBookingConflict } from "@/lib/booking";
import { slotStart } from "@/lib/format";
import type { BookingSlot } from "@/lib/types";

interface BookingTarget {
  teacherId: string;
  slotId: string;
}

export default function ParentsDayPage() {
  const { toast } = useToast();
  const { cycle } = useCycleContext();

  const [slots, setSlots] = useState<BookingSlot[]>(bookingSlots);
  const [manageId, setManageId] = useState<string | null>(null);
  const [booking, setBooking] = useState<BookingTarget | null>(null);
  const [studentId, setStudentId] = useState<string>("");
  const [cancelId, setCancelId] = useState<string | null>(null);

  const totalSlots = slots.length;
  const bookedCount = useMemo(
    () => slots.filter((s) => s.bookedByStudentId !== null).length,
    [slots],
  );
  const teacherCount = useMemo(() => new Set(slots.map((s) => s.teacherId)).size, [slots]);

  const participating = classes
    .map((cls) => ({ cls, teacher: teacherById(cls.classTeacherId) }))
    .filter((row): row is { cls: (typeof classes)[number]; teacher: NonNullable<ReturnType<typeof teacherById>> } =>
      Boolean(row.teacher),
    );

  const manageTeacher = manageId ? teacherById(manageId) : undefined;
  const manageClass = manageId ? classes.find((c) => c.classTeacherId === manageId) : undefined;
  const manageSlots = manageId ? slots.filter((s) => s.teacherId === manageId) : [];

  const bookingSlot = booking ? slots.find((s) => s.id === booking.slotId) : undefined;
  const bookingTeacher = booking ? teacherById(booking.teacherId) : undefined;
  const bookingClass = booking
    ? classes.find((c) => c.classTeacherId === booking.teacherId)
    : undefined;

  const cancelSlot = cancelId ? slots.find((s) => s.id === cancelId) : undefined;
  const cancelStudent = cancelSlot?.bookedByStudentId
    ? studentById(cancelSlot.bookedByStudentId)
    : undefined;

  const openBooking = (slot: BookingSlot) => {
    setBooking({ teacherId: slot.teacherId, slotId: slot.id });
    setStudentId("");
  };

  const confirmBooking = () => {
    if (!booking || !studentId) return;
    const slot = slots.find((s) => s.id === booking.slotId);
    const teacher = teacherById(booking.teacherId);
    const student = studentById(studentId);
    if (!slot || !teacher || !student) return;

    const start = slotStart(slot.slot);
    const conflict = findBookingConflict(slots, studentId, {
      teacherId: booking.teacherId,
      slot: slot.slot,
    });
    if (conflict) {
      const other = teacherById(conflict.teacherId);
      toast({
        variant: "destructive",
        title: "Booking conflict",
        description: `Conflict: ${student.name} is already booked at ${start} with ${other?.name ?? "another teacher"}.`,
      });
      return;
    }

    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, bookedByStudentId: studentId } : s)));
    toast({
      title: "Booked",
      description: `Booked ${slot.slot} for ${student.name} with ${teacher.name}.`,
    });
    setBooking(null);
    setStudentId("");
  };

  const confirmCancel = () => {
    if (!cancelId) return;
    const slot = slots.find((s) => s.id === cancelId);
    if (!slot) return;
    const teacher = teacherById(slot.teacherId);
    setSlots((prev) => prev.map((s) => (s.id === cancelId ? { ...s, bookedByStudentId: null } : s)));
    toast({
      title: "Booking cancelled",
      description: `${slot.slot} with ${teacher?.name ?? "the teacher"} is open again.`,
    });
    setCancelId(null);
  };

  const addSession = () => {
    toast({
      title: "Extra session slots added",
      description: "An afternoon block was requested. The timetable team confirms extended times.",
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Parents' day"
        description={`Schedule one-on-one teacher meetings for ${cycle.name}. Book and release 20-minute slots per class teacher.`}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={addSession}>
            <CalendarPlus className="size-4" /> Add session
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Date" value={cycle.parentsDayDate} icon={CalendarRange} hint={cycle.name} />
        <StatCard label="Window" value={parentsDayEvent.window} icon={Clock} hint="20-minute meetings" />
        <StatCard
          label="Slots booked"
          value={`${bookedCount}/${totalSlots}`}
          icon={CalendarCheck}
          hint={`${totalSlots - bookedCount} still open`}
        />
        <StatCard label="Teachers participating" value={teacherCount} icon={Users} hint="One per class" />
      </div>

      <SectionCard
        title="Teacher schedules"
        description="Class teachers, their booked slots and next availability."
        noPadding
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-50 pl-4">Teacher</TableHead>
                <TableHead>Class</TableHead>
                <TableHead className="min-w-38">Slots booked</TableHead>
                <TableHead>Next free slot</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participating.map(({ cls, teacher }) => {
                const teacherSlotList = slots.filter((s) => s.teacherId === teacher.id);
                const booked = teacherSlotList.filter((s) => s.bookedByStudentId !== null).length;
                const nextFree = teacherSlotList.find((s) => s.bookedByStudentId === null);
                return (
                  <TableRow key={teacher.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xs font-semibold text-primary">
                          {teacher.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-compact font-medium text-foreground">{teacher.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{teacher.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-compact">
                      {cls.name}
                      <span className="text-muted-foreground"> · {cls.room}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={(booked / teacherSlotList.length) * 100} className="h-1.5 w-24" />
                        <span className="text-xs tabular text-muted-foreground">
                          {booked}/{teacherSlotList.length}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-compact tabular">
                      {nextFree ? nextFree.slot : <span className="text-muted-foreground">Fully booked</span>}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 px-2.5 text-xs"
                        onClick={() => setManageId(teacher.id)}
                      >
                        <Pencil className="size-3.5" /> Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Manage slots dialog */}
      <Dialog open={!!manageId} onOpenChange={(open) => !open && setManageId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Slots: {manageTeacher?.name ?? "Teacher"}</DialogTitle>
            <DialogDescription>
              {manageClass?.name} · {cycle.parentsDayDate} · {parentsDayEvent.window}. Tap an open slot
              to book a meeting; tap the X to release one.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            {manageSlots.map((slot) => {
              const student = slot.bookedByStudentId ? studentById(slot.bookedByStudentId) : undefined;
              if (student) {
                return (
                  <div key={slot.id} className="rounded-md border bg-muted/50 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-medium text-foreground">{student.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        aria-label={`Cancel booking for ${student.name}`}
                        onClick={() => setCancelId(slot.id)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                    <p className="mt-0.5 text-2xs tabular text-muted-foreground">{slot.slot}</p>
                  </div>
                );
              }
              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => openBooking(slot)}
                  className="rounded-md border border-dashed px-2 py-1.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="text-xs font-medium text-muted-foreground">Open</span>
                  <p className="mt-0.5 text-2xs tabular text-muted-foreground">{slot.slot}</p>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking dialog */}
      <Dialog
        open={!!booking}
        onOpenChange={(open) => {
          if (!open) {
            setBooking(null);
            setStudentId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Book {bookingSlot?.slot ?? "slot"}</DialogTitle>
            <DialogDescription>
              {bookingTeacher?.name ?? "Teacher"} · {bookingClass?.name} · {cycle.parentsDayDate}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="booking-student">Student</Label>
            {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="booking-student" className="w-full">
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {(bookingClass ? studentsInClass(bookingClass.id) : []).map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBooking(null);
                setStudentId("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={confirmBooking} disabled={!studentId}>
              Book
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel booking confirmation */}
      <AlertDialog open={!!cancelId} onOpenChange={(open) => !open && setCancelId(null)}>
        <AlertDialogContent className="sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel booking for {cancelStudent?.name ?? "this parent"}?</AlertDialogTitle>
            <AlertDialogDescription>
              The {cancelSlot?.slot ?? "slot"} opens again for other parents to book.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep booking</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Cancel booking</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
