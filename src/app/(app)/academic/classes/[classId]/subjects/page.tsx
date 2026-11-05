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
import { useClassContext } from "@/hooks/use-academic-context";
import {
  classSubjectsFor,
  eligibleStudentsFor,
  studentsInClass,
  subjectById,
  subjects,
  teacherById,
  teachers,
} from "@/lib/demo-data";
import type { ClassSubject } from "@/lib/types";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Clock,
  Plus,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

const MAX_PERIODS = 40;

export default function ClassSubjectsPage() {
  const { toast } = useToast();
  const { klass: cls } = useClassContext();
  const classTeacher = teacherById(cls.classTeacherId);
  const allStudents = studentsInClass(cls.id);

  const [rows, setRows] = useState<ClassSubject[]>(() => classSubjectsFor(cls.id));
  const [addOpen, setAddOpen] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState("");

  const totalPeriods = rows.reduce((a, r) => a + r.periodsPerWeek, 0);
  const allocatedIds = useMemo(() => new Set(rows.map((r) => r.subjectId)), [rows]);
  const availableSubjects = subjects.filter((s) => !allocatedIds.has(s.id));
  const coreCount = rows.filter((r) => r.type === "core").length;

  const enrolledCount = (row: ClassSubject) =>
    row.type === "core"
      ? allStudents.length
      : eligibleStudentsFor(cls.id, row.subjectId).length;

  const update = (subjectId: string, patch: Partial<ClassSubject>) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r.subjectId !== subjectId) return r;
        const next = { ...r, ...patch };
        next.fullMarks = next.caMarks + next.examMarks;
        return next;
      }),
    );

  const move = (index: number, dir: -1 | 1) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const remove = (subjectId: string) => {
    const subject = subjectById(subjectId);
    setRows((prev) => prev.filter((r) => r.subjectId !== subjectId));
    toast({
      title: "Subject removed",
      description: `${subject?.name ?? "Subject"} was removed from ${cls.name}. Save to keep the change.`,
    });
  };

  const addSubject = () => {
    const subject = subjectById(newSubjectId);
    if (!subject) return;
    setRows((prev) => [
      ...prev,
      {
        subjectId: subject.id,
        classId: cls.id,
        type: "subsidiary",
        chartLabel: subject.code,
        teacherId: cls.classTeacherId,
        periodsPerWeek: 2,
        examPapers: 1,
        caMarks: 30,
        examMarks: 70,
        fullMarks: 100,
      },
    ]);
    setNewSubjectId("");
    setAddOpen(false);
    toast({
      title: "Subject added",
      description: `${subject.name} was added to ${cls.name} as a subsidiary subject with 2 periods per week.`,
    });
  };

  const save = () => {
    toast({
      title: "Class subjects saved",
      description: `${rows.length} subjects · ${coreCount} core · ${totalPeriods} periods per week recorded for ${cls.name}. The order below drives the report card and marks grids.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Subjects: ${cls.name}`}
        description={`Class subjects link a subject from the catalogue to this class for ${cls.level}: who teaches it, how it is assessed and which students take it. The order below is the order subjects appear on the report card and in every marks-entry grid.`}
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
                    The subject is appended as a subsidiary (opt-in) subject with 2 weekly periods; adjust the row afterwards.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-1.5 py-1">
                  <Label htmlFor="new-subject">Subject</Label>
                  {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
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
              <Save className="size-4" /> Save subjects
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subjects allocated"
          value={`${rows.length}/${subjects.length}`}
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
          label="Core · Subsidiary"
          value={`${coreCount} · ${rows.length - coreCount}`}
          icon={BookOpen}
          hint="Core is compulsory; subsidiary is opt-in per student"
        />
        <StatCard
          label="Class teacher"
          value={classTeacher?.name ?? "-"}
          icon={Users}
          hint={classTeacher?.role ?? "Unassigned"}
        />
      </div>

      <SectionCard
        noPadding
        title="Class subjects"
        description="Edits are held locally until you save. Subject order is the report-card and marks-grid order."
      >
        {rows.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No subjects allocated"
            description={`Add subjects to build the subject list for ${cls.name}.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16 pl-4 text-center">Order</TableHead>
                  <TableHead className="min-w-45">Subject</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-28">Chart label</TableHead>
                  <TableHead className="min-w-45">Teacher</TableHead>
                  <TableHead className="w-20 text-center">Periods / week</TableHead>
                  <TableHead className="w-20 text-center">Exam papers</TableHead>
                  <TableHead className="w-20 text-center">CA marks</TableHead>
                  <TableHead className="w-20 text-center">Exam marks</TableHead>
                  <TableHead className="w-20 text-center">Full marks</TableHead>
                  <TableHead className="w-24 text-center">Enrolled</TableHead>
                  <TableHead className="w-14 pr-4 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => {
                  const subject = subjectById(row.subjectId);
                  if (!subject) return null;
                  const enrolled = enrolledCount(row);
                  return (
                    <TableRow key={row.subjectId}>
                      <TableCell className="pl-4">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => move(i, -1)}
                            disabled={i === 0}
                            aria-label={`Move ${subject.name} up`}
                          >
                            <ArrowUp className="size-3.5" />
                          </Button>
                          <span className="w-4 text-center text-xs tabular text-muted-foreground">{i + 1}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 text-muted-foreground hover:text-foreground"
                            onClick={() => move(i, 1)}
                            disabled={i === rows.length - 1}
                            aria-label={`Move ${subject.name} down`}
                          >
                            <ArrowDown className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="whitespace-nowrap text-compact font-medium text-foreground">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">{subject.department}</p>
                      </TableCell>
                      <TableCell>
                        {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
                        <Select
                          value={row.type}
                          onValueChange={(v) => update(row.subjectId, { type: v as ClassSubject["type"] })}
                        >
                          <SelectTrigger className="h-8 w-full text-compact" aria-label={`Type for ${subject.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="core">Core</SelectItem>
                            <SelectItem value="subsidiary">Subsidiary</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.chartLabel}
                          maxLength={12}
                          onChange={(e) => update(row.subjectId, { chartLabel: e.target.value })}
                          className="h-8 w-20 text-compact"
                          aria-label={`Chart label for ${subject.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
                        <Select
                          value={row.teacherId}
                          onValueChange={(v) => update(row.subjectId, { teacherId: v })}
                        >
                          <SelectTrigger className="h-8 w-full min-w-40 text-compact">
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
                          value={String(row.periodsPerWeek)}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            update(row.subjectId, {
                              periodsPerWeek: Number.isNaN(n) ? 1 : Math.min(8, Math.max(1, n)),
                            });
                          }}
                          className="mx-auto h-8 w-14 text-center text-compact tabular"
                          aria-label={`Periods per week for ${subject.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
                        <Select
                          value={String(row.examPapers)}
                          onValueChange={(v) => update(row.subjectId, { examPapers: Number(v) as 1 | 2 })}
                        >
                          <SelectTrigger className="mx-auto h-8 w-14 text-compact" aria-label={`Exam papers for ${subject.name}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={String(row.caMarks)}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            update(row.subjectId, { caMarks: Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) });
                          }}
                          className="mx-auto h-8 w-14 text-center text-compact tabular"
                          aria-label={`CA marks for ${subject.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={String(row.examMarks)}
                          onChange={(e) => {
                            const n = Number.parseInt(e.target.value, 10);
                            update(row.subjectId, { examMarks: Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) });
                          }}
                          className="mx-auto h-8 w-14 text-center text-compact tabular"
                          aria-label={`Exam marks for ${subject.name}`}
                        />
                      </TableCell>
                      <TableCell className="text-center text-compact font-medium tabular">{row.fullMarks}</TableCell>
                      <TableCell className="text-center text-compact tabular">
                        {row.type === "core" ? (
                          <span className="text-muted-foreground">All ({enrolled})</span>
                        ) : (
                          <span>
                            {enrolled}
                            <span className="text-muted-foreground">/{allStudents.length}</span>
                          </span>
                        )}
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
                                The class subject, its {row.periodsPerWeek} weekly periods and its enrolment will be
                                dropped. You can add it back before saving.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => remove(row.subjectId)}
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/70 px-4 py-3 text-compact text-muted-foreground">
          <span className="tabular">
            Total periods <span className="font-medium text-foreground">{totalPeriods}</span> / {MAX_PERIODS}
          </span>
          {totalPeriods > MAX_PERIODS ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-destructive">
              <AlertTriangle className="size-3.5" />
              Total exceeds {MAX_PERIODS} periods. Reduce allocations
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {Math.max(0, MAX_PERIODS - totalPeriods)} periods still free this week
            </span>
          )}
          <span className="ml-auto max-w-md text-2xs leading-relaxed">
            Division note: secondary division (I–IV) is computed from a student&apos;s best 7 graded subjects — a
            student taking fewer than 7 graded subjects (core + enrolled subsidiaries) cannot be placed in a division.
          </span>
        </div>
      </SectionCard>
    </div>
  );
}
