"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DEMO_IDS } from "@/lib/demo-config";
import {
  classById,
  subjectById,
  subjectTeacherOf,
  subjects,
  teacherById,
  teachers,
} from "@/lib/demo-data";
import { AlertTriangle, BookOpen, Clock, MapPin, Plus, Save, Trash2, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

interface Allocation {
  subjectId: string;
  teacherId: string;
  periods: number;
  room: string;
}

const DEFAULT_PERIODS = [5, 4, 4, 3, 3, 3, 2, 2, 2];
const DEFAULT_ROOMS = ["C1", "B7", "Lab 1", "Lab 2", "Lab 3", "C3", "B2", "B4", "ICT Lab"];
const MAX_PERIODS = 40;

export default function ClassSubjectsPage() {
  const { toast } = useToast();
  const params = useParams<{ classId?: string }>();
  const cls = classById(params.classId ?? "") ?? classById(DEMO_IDS.classId)!;
  const classTeacher = teacherById(cls.classTeacherId);

  const [allocations, setAllocations] = useState<Allocation[]>(() =>
    subjects.map((s, i) => ({
      subjectId: s.id,
      teacherId: subjectTeacherOf(s.id, cls.id)?.id ?? cls.classTeacherId,
      periods: DEFAULT_PERIODS[i % DEFAULT_PERIODS.length],
      room: DEFAULT_ROOMS[i % DEFAULT_ROOMS.length],
    })),
  );
  const [addOpen, setAddOpen] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState("");

  const totalPeriods = allocations.reduce((a, r) => a + r.periods, 0);
  const allocatedIds = useMemo(() => new Set(allocations.map((a) => a.subjectId)), [allocations]);
  const availableSubjects = subjects.filter((s) => !allocatedIds.has(s.id));

  const update = (subjectId: string, patch: Partial<Allocation>) =>
    setAllocations((prev) => prev.map((a) => (a.subjectId === subjectId ? { ...a, ...patch } : a)));

  const remove = (subjectId: string) => {
    const subject = subjectById(subjectId);
    setAllocations((prev) => prev.filter((a) => a.subjectId !== subjectId));
    toast({
      title: "Subject removed",
      description: `${subject?.name ?? "Subject"} was removed from ${cls.name}. Save to keep the change.`,
    });
  };

  const addSubject = () => {
    const subject = subjectById(newSubjectId);
    if (!subject) return;
    setAllocations((prev) => [
      ...prev,
      {
        subjectId: subject.id,
        teacherId: subjectTeacherOf(subject.id, cls.id)?.id ?? cls.classTeacherId,
        periods: 2,
        room: cls.room,
      },
    ]);
    setNewSubjectId("");
    setAddOpen(false);
    toast({
      title: "Subject added",
      description: `${subject.name} was added to ${cls.name} with 2 periods per week.`,
    });
  };

  const save = () => {
    toast({
      title: "Allocation saved",
      description: `${allocations.length} subjects · ${totalPeriods} periods per week recorded for ${cls.name}.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Subjects — ${cls.name}`}
        description={`Subject allocation for ${cls.level} · assign teachers, weekly periods and rooms per subject.`}
        actions={
          <>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5" disabled={availableSubjects.length === 0}>
                  <Plus className="size-4" /> Add subject
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add a subject to {cls.name}</DialogTitle>
                  <DialogDescription>
                    The subject is appended with 2 weekly periods; adjust the row afterwards.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-1.5 py-1">
                  <Label htmlFor="new-subject">Subject</Label>
                  <Select value={newSubjectId} onValueChange={setNewSubjectId}>
                    <SelectTrigger id="new-subject" className="w-full">
                      <SelectValue placeholder="Choose a subject…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addSubject} disabled={!newSubjectId}>
                    Add subject
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button size="sm" className="gap-1.5" onClick={save}>
              <Save className="size-4" /> Save allocation
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subjects allocated"
          value={`${allocations.length}/${subjects.length}`}
          icon={BookOpen}
          tone="primary"
          hint={`${availableSubjects.length} still available`}
        />
        <StatCard
          label="Periods per week"
          value={totalPeriods}
          icon={Clock}
          tone={totalPeriods > MAX_PERIODS ? "destructive" : "default"}
          hint={`Timetable ceiling ${MAX_PERIODS} periods`}
        />
        <StatCard
          label="Class teacher"
          value={classTeacher?.name ?? "—"}
          icon={Users}
          hint={classTeacher?.role ?? "Unassigned"}
        />
        <StatCard label="Main room" value={cls.room} icon={MapPin} hint={`${cls.level} home base`} />
      </div>

      <SectionCard
        noPadding
        title="Allocated subjects"
        description="Edits are held locally until you save the allocation."
      >
        {allocations.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects allocated"
            description={`Add subjects to build the weekly timetable for ${cls.name}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-[220px] pl-4">Subject</TableHead>
                  <TableHead className="min-w-[200px]">Assigned teacher</TableHead>
                  <TableHead className="w-28 text-center">Periods/week</TableHead>
                  <TableHead className="w-28">Room</TableHead>
                  <TableHead className="w-14 pr-4 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocations.map((alloc) => {
                  const subject = subjectById(alloc.subjectId);
                  if (!subject) return null;
                  return (
                    <TableRow key={alloc.subjectId}>
                      <TableCell className="pl-4">
                        <p className="text-[13.5px] font-medium text-foreground">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subject.code} · {subject.department}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={alloc.teacherId}
                          onValueChange={(v) => update(alloc.subjectId, { teacherId: v })}
                        >
                          <SelectTrigger className="h-8 w-full min-w-44 text-[13px]">
                            <SelectValue placeholder="Assign teacher…" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={1}
                          max={8}
                          value={String(alloc.periods)}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            update(alloc.subjectId, {
                              periods: Number.isNaN(n) ? 1 : Math.min(8, Math.max(1, n)),
                            });
                          }}
                          className="mx-auto h-8 w-16 text-center text-[13px] tabular"
                          aria-label={`Periods per week for ${subject.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={alloc.room}
                          onChange={(e) => update(alloc.subjectId, { room: e.target.value })}
                          className="h-8 w-24 text-[13px]"
                          aria-label={`Room for ${subject.name}`}
                        />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              aria-label={`Remove ${subject.name}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {subject.name} from {cls.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                The subject and its {alloc.periods} weekly periods will be dropped from this
                                allocation. You can add it back before saving.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove(alloc.subjectId)}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/70 px-4 py-3 text-[13px] text-muted-foreground">
          <span className="tabular">
            Total periods <span className="font-medium text-foreground">{totalPeriods}</span> / {MAX_PERIODS}
          </span>
          {totalPeriods > MAX_PERIODS ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
              <AlertTriangle className="size-3.5" />
              Total exceeds 40 periods — reduce allocations
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {Math.max(0, MAX_PERIODS - totalPeriods)} periods still free this week
            </span>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
