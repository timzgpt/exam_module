"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import {
  activeAssignmentFor,
  adoptedCurriculum,
  classesForSection,
  levelsForSection,
  workloadFor,
  type SchoolSection,
} from "@/lib/academic-admin";
import { allClasses, classById, teachers, teacherById } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

const SECTIONS: SchoolSection[] = ["Early Years", "Primary", "Secondary"];
const YEAR = "2026";

export default function TeacherAllocationPage() {
  useAcademicAdmin();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Teacher Allocation"
        description="Assign responsible teachers to class subjects and learning areas. Marks-entry access follows these active assignments."
        actions={<AssignDialog />}
      />
      <Tabs defaultValue="by-class">
        <TabsList>
          <TabsTrigger value="by-class">By class</TabsTrigger>
          <TabsTrigger value="by-teacher">By teacher</TabsTrigger>
        </TabsList>
        <TabsContent value="by-class" className="mt-4">
          <ByClassView />
        </TabsContent>
        <TabsContent value="by-teacher" className="mt-4">
          <ByTeacherView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ================================================================
 * View A: by class
 * ================================================================ */

function ByClassView() {
  useAcademicAdmin();
  const items = useAcademicAdminStore((s) => s.items);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const unassign = useAcademicAdminStore((s) => s.unassignTeacher);
  const { toast } = useToast();

  const [section, setSection] = useState<SchoolSection>("Secondary");
  const [level, setLevel] = useState("Form 3");
  const [classId, setClassId] = useState("01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21");

  const levels = levelsForSection(section);
  const sectionClasses = classesForSection(section, level);
  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const ordered = [...(curriculum?.items ?? [])].sort((a, b) => a.order - b.order);

  const pickSection = (v: string) => {
    const sec = v as SchoolSection;
    setSection(sec);
    const l = levelsForSection(sec)[0] ?? "";
    setLevel(l);
    setClassId(classesForSection(sec, l)[0]?.id ?? "");
  };

  return (
    <div className="space-y-4">
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
            <Select value={level} onValueChange={(l) => { setLevel(l); setClassId(classesForSection(section, l)[0]?.id ?? ""); }}>
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

      <SectionCard
        noPadding
        title={`Assignments — ${classById(classId)?.name ?? classId}`}
        description="A teacher can teach several subjects and classes; the same subject may have different teachers in different streams."
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-48 pl-4">Subject / learning area</TableHead>
              <TableHead className="w-16">Code</TableHead>
              <TableHead className="min-w-52">Teacher</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28 pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((ci) => {
              const item = items.find((i) => i.id === ci.itemId);
              if (!item) return null;
              const active = activeAssignmentFor({ assignments }, classId, ci.itemId, YEAR);
              return (
                <TableRow key={ci.itemId}>
                  <TableCell className="pl-4 text-compact font-medium">{item.name}</TableCell>
                  <TableCell className="font-mono text-xs">{item.code}</TableCell>
                  <TableCell>
                    {active ? (
                      <span className="text-compact">{teacherById(active.teacherId)?.name ?? active.teacherId}</span>
                    ) : (
                      <span className="text-compact text-destructive">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {active ? (
                      active.status === "assigned" ? (
                        <Badge variant="secondary" className="font-normal">Assigned</Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-muted-foreground">Pending</Badge>
                      )
                    ) : (
                      <Badge variant="destructive" className="font-normal">Missing</Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <AssignDialog classId={classId} itemId={ci.itemId} compact />
                      {active ? (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => {
                            const r = unassign(active.id);
                            if (!r.ok) toast({ title: "Cannot unassign", description: r.error, variant: "destructive" });
                            else toast({ title: "Assignment released", description: "History is preserved." });
                          }}>
                          Release
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

/* ================================================================
 * View B: by teacher
 * ================================================================ */

function ByTeacherView() {
  useAcademicAdmin();
  const items = useAcademicAdminStore((s) => s.items);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const curricula = useAcademicAdminStore((s) => s.curricula);

  const rows = teachers.map((t) => {
    const wl = workloadFor({ assignments, curricula }, t.id, YEAR);
    return { teacher: t, wl };
  });

  return (
    <div className="space-y-4">
      <SectionCard
        noPadding
        title="Workload by teacher"
        description="Active assignments for the academic year. Team teaching is only visible when explicitly enabled by a second assignment row."
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-44 pl-4">Teacher</TableHead>
              <TableHead className="w-44">Role</TableHead>
              <TableHead className="w-20 text-center">Classes</TableHead>
              <TableHead className="w-20 text-center">Assignments</TableHead>
              <TableHead className="w-24 text-center">Periods / wk</TableHead>
              <TableHead className="min-w-56 pr-4">Assigned classes · subjects</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ teacher, wl }) => (
              <TableRow key={teacher.id}>
                <TableCell className="pl-4">
                  <p className="text-compact font-medium text-foreground">{teacher.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{teacher.id}</p>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{teacher.role}</TableCell>
                <TableCell className="text-center text-compact tabular">{wl.classes.length}</TableCell>
                <TableCell className="text-center text-compact tabular">{wl.items.length}</TableCell>
                <TableCell className="text-center text-compact tabular">{wl.periods}</TableCell>
                <TableCell className="pr-4">
                  {wl.items.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No active assignments</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {wl.items.slice(0, 8).map((row) => (
                        <Badge key={`${row.classId}-${row.itemId}`} variant="secondary" className="font-normal">
                          {classById(row.classId)?.name ?? row.classId} · {items.find((i) => i.id === row.itemId)?.code}
                        </Badge>
                      ))}
                      {wl.items.length > 8 ? (
                        <Badge variant="outline" className="font-normal">+{wl.items.length - 8} more</Badge>
                      ) : null}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <AssignmentHistory />
    </div>
  );
}

function AssignmentHistory() {
  useAcademicAdmin();
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const items = useAcademicAdminStore((s) => s.items);
  const history = assignments
    .filter((a) => a.endsAt !== null)
    .sort((a, b) => (b.endsAt ?? "").localeCompare(a.endsAt ?? ""))
    .slice(0, 10);
  return (
    <SectionCard
      noPadding
      title="Recent reassignments (history)"
      description="Previous assignments are preserved — replaced rows are closed with an end date, never deleted."
    >
      {history.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No reassignments yet. Reassigning a subject creates a historical row here.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Teacher</TableHead>
              <TableHead>Class · item</TableHead>
              <TableHead className="w-32">Ended</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="pl-4 text-compact">{teacherById(a.teacherId)?.name ?? a.teacherId}</TableCell>
                <TableCell className="text-compact text-muted-foreground">
                  {classById(a.classId)?.name ?? a.classId} · {items.find((i) => i.id === a.itemId)?.name ?? a.itemId}
                </TableCell>
                <TableCell className="text-xs tabular text-muted-foreground">{a.endsAt?.slice(0, 10)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

/* ================================================================
 * Assign dialog
 * ================================================================ */

function AssignDialog({ classId: fixedClassId, itemId: fixedItemId, compact }: {
  classId?: string;
  itemId?: string;
  compact?: boolean;
}) {
  useAcademicAdmin();
  const { toast } = useToast();
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const items = useAcademicAdminStore((s) => s.items);
  const assignTeacher = useAcademicAdminStore((s) => s.assignTeacher);
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState(fixedClassId ?? "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21");
  const [itemId, setItemId] = useState(fixedItemId ?? "");
  const [teacherId, setTeacherId] = useState("");
  const [status, setStatus] = useState<"assigned" | "pending">("assigned");

  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const curriculumItems = [...(curriculum?.items ?? [])].sort((a, b) => a.order - b.order);
  const active = fixedItemId ? activeAssignmentFor({ assignments }, classId, fixedItemId, YEAR) : undefined;

  const submit = () => {
    const result = assignTeacher({
      teacherId,
      classId,
      itemId: fixedItemId ?? itemId,
      academicYear: YEAR,
      role: "subject-teacher",
      status,
    });
    if (!result.ok) {
      toast({ title: "Cannot assign", description: result.error, variant: "destructive" });
      return;
    }
    toast({
      title: status === "assigned" ? "Teacher assigned" : "Assignment marked pending",
      description: `${teacherById(teacherId)?.name} → ${classById(classId)?.name} · ${items.find((i) => i.id === (fixedItemId ?? itemId))?.name}. Marks-entry access updated.`,
    });
    setOpen(false);
    setTeacherId("");
    setStatus("assigned");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant={compact ? "ghost" : "default"}
        size={compact ? "sm" : "sm"}
        className={compact ? "h-7 gap-1 px-2 text-xs" : "gap-1.5"}
        onClick={() => {
          setClassId(fixedClassId ?? classId);
          setItemId(fixedItemId ?? "");
          setOpen(true);
        }}
      >
        <UserPlus className="size-3.5" /> {compact ? "Assign" : "Assign teacher"}
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a teacher</DialogTitle>
          <DialogDescription>
            {active
              ? `Currently ${teacherById(active.teacherId)?.name ?? active.teacherId} — reassigning keeps the previous row as history.`
              : "Pick the class, the item and the responsible teacher."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setItemId(""); }}>
              <SelectTrigger className="w-full" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allClasses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Subject / learning area</Label>
            <Select value={fixedItemId ?? itemId} onValueChange={setItemId} disabled={!!fixedItemId}>
              <SelectTrigger className="w-full" aria-label="Subject or learning area">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {curriculumItems.map((ci) => {
                  const item = items.find((i) => i.id === ci.itemId);
                  return item ? <SelectItem key={ci.itemId} value={ci.itemId}>{item.name}</SelectItem> : null;
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="w-full" aria-label="Teacher">
                <SelectValue placeholder="Choose teacher…" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "assigned" | "pending")}>
              <SelectTrigger className="w-full" aria-label="Assignment status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned">Assigned (active)</SelectItem>
                <SelectItem value="pending">Pending confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!teacherId || (!fixedItemId && !itemId)}>
            Save assignment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
