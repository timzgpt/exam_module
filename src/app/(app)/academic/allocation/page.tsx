"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import {
  adoptedCurriculum,
  activeAssignmentFor,
  classCompleteness,
  classesForSection,
  levelsForSection,
  registeredStudentsFor,
  type SchoolSection,
} from "@/lib/academic-admin";
import { allClasses, classById, studentsInClass, teacherById } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  ListPlus,
  Trash2,
  Users,
} from "lucide-react";

const SECTIONS: SchoolSection[] = ["Early Years", "Primary", "Secondary"];

export default function AllocationPage() {
  useAcademicAdmin();
  const { toast } = useToast();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const items = useAcademicAdminStore((s) => s.items);
  const adopt = useAcademicAdminStore((s) => s.adoptCurriculum);
  const bulkAdopt = useAcademicAdminStore((s) => s.bulkAdoptCurriculum);
  const publishAdoption = useAcademicAdminStore((s) => s.publishAdoption);

  const [section, setSection] = useState<SchoolSection>("Secondary");
  const [level, setLevel] = useState("Form 3");
  const [classId, setClassId] = useState("01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21");
  const [applyOpen, setApplyOpen] = useState(false);
  const [bulkClassIds, setBulkClassIds] = useState<string[]>([]);
  const [pickedCurriculumId, setPickedCurriculumId] = useState("");

  const levels = levelsForSection(section);
  const sectionClasses = classesForSection(section, level);
  const year = "2026";

  const pickSection = (s: string) => {
    const sec = s as SchoolSection;
    setSection(sec);
    const firstLevel = levelsForSection(sec)[0] ?? "";
    setLevel(firstLevel);
    const firstClass = classesForSection(sec, firstLevel)[0];
    setClassId(firstClass?.id ?? "");
  };

  const pickLevel = (l: string) => {
    setLevel(l);
    const firstClass = classesForSection(section, l)[0];
    setClassId(firstClass?.id ?? "");
  };

  const curriculum = adoptedCurriculum(
    { curricula, adoptions },
    classId,
    year,
  );
  const adoption = adoptions[`${classId}|${year}`];
  const completeness = classCompleteness(
    { curricula, adoptions, assignments, registrations, items },
    classId,
    year,
  );

  const ordered = useMemo(
    () => [...(curriculum?.items ?? [])].sort((a, b) => a.order - b.order),
    [curriculum],
  );

  const candidateCurricula = curricula.filter(
    (c) => c.section === section && c.academicYear === year,
  );
  const levelClasses = allClasses.filter((c) => c.level === level);

  const applyToSelection = (curriculumId: string) => {
    const result = bulkAdopt([classId, ...bulkClassIds], year, curriculumId);
    if (!result.ok) {
      toast({ title: "Cannot apply curriculum", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: "Curriculum applied",
      description: `${1 + bulkClassIds.length} class(es) now run this curriculum in draft — review and publish.`,
    });
    setApplyOpen(false);
    setBulkClassIds([]);
    setPickedCurriculumId("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Class Subject Allocation"
        description="Apply a level curriculum to actual class streams. A subject allocated to Form 1A never leaks to Form 1B unless you apply it explicitly."
        actions={
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setApplyOpen(true)}
            disabled={!classId}>
            Apply curriculum…
          </Button>
        }
      />

      {/* Scope selector */}
      <SectionCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">School section</Label>
            <Select value={section} onValueChange={pickSection}>
              <SelectTrigger className="w-full" aria-label="School section"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Class level</Label>
            <Select value={level} onValueChange={pickLevel}>
              <SelectTrigger className="w-full" aria-label="Class level"><SelectValue /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">Class stream</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-full" aria-label="Class stream"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sectionClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {classId && adoption ? (
        <>
          {/* Class overview strip */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat label="Allocated items" value={String(ordered.length)}
              hint={curriculum?.name ?? ""} />
            <MiniStat
              label="Core · Optional"
              value={`${ordered.filter((ci) => ci.classification === "core").length} · ${ordered.filter((ci) => ci.classification === "optional").length}`}
              hint="Compulsory vs opt-in"
            />
            <MiniStat
              label="Configuration status"
              value={`${completeness.score}%`}
              hint={[completeness.allocation && "allocation", completeness.teachers && "teachers", completeness.registrations && "registrations", completeness.assessment && "assessment"].filter(Boolean).join(" · ") || "incomplete"}
            />
            <MiniStat
              label="Allocation status"
              value={adoption.status === "published" ? "Published" : "Draft"}
              hint={adoption.publishedAt ? `published ${adoption.publishedAt.slice(0, 10)}` : "not yet published"}
            />
          </div>

          {adoption.status === "draft" ? (
            <SectionCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-compact text-muted-foreground">
                  This allocation is a draft — review the subjects below, then publish to make it the class&apos;s
                  operative configuration.
                </p>
                <Button size="sm" className="gap-1.5" onClick={() => {
                  const r = publishAdoption(classId, year);
                  if (!r.ok) toast({ title: "Cannot publish", description: r.error, variant: "destructive" });
                  else toast({ title: "Allocation published", description: `${classById(classId)?.name} now runs this curriculum.` });
                }}>
                  <CheckCircle2 className="size-4" /> Confirm & publish
                </Button>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            noPadding
            title={`Allocated academic items — ${classById(classId)?.name ?? classId}`}
            description="Order drives the report card and the marks-entry grids. Teachers come from Teacher Allocation."
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16 pl-4 text-center">Order</TableHead>
                  <TableHead className="min-w-44">Item</TableHead>
                  <TableHead className="w-20">Code</TableHead>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead className="min-w-40">Teacher</TableHead>
                  <TableHead className="w-28 text-center">Registered</TableHead>
                  <TableHead className="w-28">Assessment</TableHead>
                  <TableHead className="w-20 pr-4 text-right">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordered.map((ci, i) => {
                  const item = items.find((it) => it.id === ci.itemId);
                  if (!item) return null;
                  const assignment = activeAssignmentFor(
                    { assignments }, classId, ci.itemId, year,
                  );
                  const registered = registeredStudentsFor(
                    { registrations }, classId, ci.itemId, year,
                  );
                  const registeredCount = registered?.length ?? 0;
                  return (
                    <TableRow key={ci.itemId}>
                      <TableCell className="pl-4">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
                            disabled={i === 0}
                            onClick={() => useAcademicAdminStore.getState().reorderCurriculumItem(curriculum!.id, ci.itemId, -1)}
                            aria-label={`Move ${item.name} up`}><ArrowUp className="size-3.5" /></Button>
                          <span className="w-4 text-center text-xs tabular text-muted-foreground">{i + 1}</span>
                          <Button variant="ghost" size="icon" className="size-6 text-muted-foreground"
                            disabled={i === ordered.length - 1}
                            onClick={() => useAcademicAdminStore.getState().reorderCurriculumItem(curriculum!.id, ci.itemId, 1)}
                            aria-label={`Move ${item.name} down`}><ArrowDown className="size-3.5" /></Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-compact font-medium text-foreground">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {ci.classification === "core" ? "Core" : "Optional"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {assignment ? (
                          <span className="text-compact">
                            {teacherById(assignment.teacherId)?.name ?? assignment.teacherId}
                            {assignment.status === "pending" ? (
                              <Badge variant="outline" className="ml-1.5 font-normal text-muted-foreground">pending</Badge>
                            ) : null}
                          </span>
                        ) : (
                          <span className="text-compact text-destructive">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-compact tabular">
                        {ci.assessment.developmentalModel ? (
                          <span className="text-muted-foreground">all ({registeredCount})</span>
                        ) : ci.classification === "core" ? (
                          <span className="text-muted-foreground">all ({registeredCount})</span>
                        ) : (
                          `${registeredCount}`
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ci.assessment.developmentalModel
                          ? "Developmental"
                          : `CA ${ci.assessment.caMarks} + ${ci.assessment.examMarks}`}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            const r = useAcademicAdminStore.getState().removeFromAdoption(classId, year, ci.itemId);
                            if (!r.ok) toast({ title: "Cannot remove", description: r.error, variant: "destructive" });
                            else toast({ title: "Item removed", description: `${item.name} removed from the class allocation.` });
                          }}
                          aria-label={`Remove ${item.name}`}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Student registration coverage */}
          <RegistrationCoverage classId={classId} year={year} />
        </>
      ) : classId ? (
        <SectionCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CircleDashed className="size-8 text-muted-foreground" />
            <div>
              <p className="text-compact font-medium text-foreground">No curriculum applied yet</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {classById(classId)?.name} has no adopted curriculum for {year}. Apply the level curriculum to start
                allocating subjects, teachers and registrations.
              </p>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setApplyOpen(true)}>
              <ListPlus className="size-4" /> Apply curriculum…
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {/* Apply curriculum dialog with bulk streams */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply a curriculum</DialogTitle>
            <DialogDescription>
              The class adopts the curriculum in draft. Optionally apply the same curriculum to other streams of{" "}
              {level} in one action.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label>Curriculum for {section}</Label>
              <Select value={pickedCurriculumId || curriculum?.id || ""} onValueChange={setPickedCurriculumId}>
                <SelectTrigger className="w-full" aria-label="Curriculum to apply">
                  <SelectValue placeholder={curriculum?.name ?? "None available"} />
                </SelectTrigger>
                <SelectContent>
                  {candidateCurricula.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} (v{c.version})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The class currently runs {curriculum?.name ?? "no curriculum"} — picking another replaces it.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Also apply to these {level} streams</Label>
              <div className="grid gap-2 rounded-md border p-3">
                {levelClasses.filter((c) => c.id !== classId).map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={bulkClassIds.includes(c.id)}
                      onCheckedChange={() =>
                        setBulkClassIds((s) =>
                          s.includes(c.id) ? s.filter((x) => x !== c.id) : [...s, c.id],
                        )
                      }
                    />
                    {c.name}
                  </label>
                ))}
                {levelClasses.filter((c) => c.id !== classId).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No other streams at this level.</p>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button
              disabled={!pickedCurriculumId && !curriculum}
              onClick={() => {
                const target = pickedCurriculumId || curriculum?.id;
                if (target) applyToSelection(target);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MiniStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/** Per-student registration coverage for the class (task §6). */
function RegistrationCoverage({ classId, year }: { classId: string; year: string }) {
  useAcademicAdmin();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const students = useMemo(() => studentsInClass(classId), [classId]);
  const curriculum = adoptedCurriculum(
    { curricula, adoptions }, classId, year,
  );
  const expected = curriculum?.items.length ?? 0;
  const rows = students.map((s) => {
    const active = registrations.filter(
      (r) => r.classId === classId && r.studentId === s.id && r.status === "active" && r.academicYear === year,
    );
    return { student: s, count: active.length, complete: expected > 0 && active.length >= expected };
  });
  const completeCount = rows.filter((r) => r.complete).length;

  return (
    <SectionCard
      noPadding
      title="Student registration coverage"
      description={`${completeCount}/${rows.length} students fully registered against the ${expected} allocated item(s).`}
      actions={
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <a href="/academic/registrations">Manage registrations</a>
        </Button>
      }
    >
      <div className="max-h-64 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Student</TableHead>
              <TableHead className="w-24 text-center">Adm. no</TableHead>
              <TableHead className="w-32 text-center">Registered</TableHead>
              <TableHead className="w-32 pr-4">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.student.id}>
                <TableCell className="pl-4 text-compact">{r.student.name}</TableCell>
                <TableCell className="text-center font-mono text-xs text-muted-foreground">{r.student.admissionNo}</TableCell>
                <TableCell className="text-center text-compact tabular">{r.count} / {expected}</TableCell>
                <TableCell className="pr-4">
                  {r.complete ? (
                    <span className="inline-flex items-center gap-1.5 text-compact text-emerald-600">
                      <ClipboardCheck className="size-3.5" /> Complete
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-compact text-amber-600">
                      <Users className="size-3.5" /> {expected - r.count} missing
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </SectionCard>
  );
}
