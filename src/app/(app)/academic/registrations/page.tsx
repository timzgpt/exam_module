"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAcademicAdminStore, useAcademicAdmin } from "@/lib/academic-store";
import {
  adoptedCurriculum,
  classesForSection,
  itemById,
  levelsForSection,
  registeredItemIdsForStudent,
  validateRegistration,
  type SchoolSection,
} from "@/lib/academic-admin";
import { classById, studentsInClass, teacherById } from "@/lib/demo-data";
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
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Users,
} from "lucide-react";

const SECTIONS: SchoolSection[] = ["Early Years", "Primary", "Secondary"];
const YEAR = "2026";

export default function RegistrationsPage() {
  useAcademicAdmin();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Student Subject Registration"
        description="Core subjects and Early Years learning areas are registered automatically from the class curriculum. Optional subjects follow the class registration mode — individual selection or predefined combinations."
      />
      <Tabs defaultValue="individual">
        <TabsList>
          <TabsTrigger value="individual">Individual registration</TabsTrigger>
          <TabsTrigger value="combination">Combination registration</TabsTrigger>
          <TabsTrigger value="bulk">Bulk registration</TabsTrigger>
        </TabsList>
        <TabsContent value="individual" className="mt-4">
          <SectionPickers>{({ classId }) => <IndividualRegistration classId={classId} />}</SectionPickers>
        </TabsContent>
        <TabsContent value="combination" className="mt-4">
          <SectionPickers>{({ classId }) => <CombinationRegistration classId={classId} />}</SectionPickers>
        </TabsContent>
        <TabsContent value="bulk" className="mt-4">
          <SectionPickers>{({ classId }) => <BulkRegistration classId={classId} />}</SectionPickers>
        </TabsContent>
      </Tabs>
      <AuditTrail />
    </div>
  );
}

/** Shared section → level → class selector wired through a render prop. */
function SectionPickers({ children }: { children: (ctx: { classId: string }) => React.ReactNode }) {
  const [section, setSection] = useState<SchoolSection>("Secondary");
  const [level, setLevel] = useState("Form 3");
  const [classId, setClassId] = useState("01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21");

  const levels = levelsForSection(section);
  const sectionClasses = classesForSection(section, level);

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">School section</Label>
            <Select value={section} onValueChange={(v) => {
              const sec = v as SchoolSection;
              setSection(sec);
              const l = levelsForSection(sec)[0] ?? "";
              setLevel(l);
              setClassId(classesForSection(sec, l)[0]?.id ?? "");
            }}>
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
      {children({ classId })}
    </div>
  );
}

/* ================================================================
 * Individual registration
 * ================================================================ */

function IndividualRegistration({ classId }: { classId: string }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const items = useAcademicAdminStore((s) => s.items);
  const combinations = useAcademicAdminStore((s) => s.combinations);
  const registrationModes = useAcademicAdminStore((s) => s.registrationModes);
  const registerSubjects = useAcademicAdminStore((s) => s.registerStudentSubjects);
  const dropRegistration = useAcademicAdminStore((s) => s.dropRegistration);

  const [studentId, setStudentId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const students = useMemo(() => studentsInClass(classId), [classId]);
  const student = students.find((s) => s.id === studentId);
  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const mode = useAcademicAdminStore((s) => s.registrationModes[`${classId}|${YEAR}`]) ?? "individual";

  const coreItems = (curriculum?.items ?? []).filter((ci) => ci.classification === "core");
  const optionalItems = (curriculum?.items ?? []).filter((ci) => ci.classification === "optional");

  const activeItemIds = student
    ? registeredItemIdsForStudent({ registrations }, classId, student.id, YEAR) ?? []
    : [];
  const activeSet = new Set(activeItemIds);

  const validation = student
    ? validateRegistration(
        { curricula, adoptions, registrations, items, combinations, registrationModes },
        student.id, classId, selected, null, YEAR,
      )
    : null;

  if (!curriculum) {
    return (
      <SectionCard>
        <p className="py-10 text-center text-sm text-muted-foreground">
          This class has no adopted curriculum — apply one on the Class Subject Allocation page first.
        </p>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={(v) => { setStudentId(v); setSelected([]); }}>
              <SelectTrigger className="w-full" aria-label="Student"><SelectValue placeholder="Choose student…" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.admissionNo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Class registration mode</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-compact text-muted-foreground">
              {mode === "both" ? "Individual selection or combinations" : mode === "combinations" ? "Predefined combinations" : "Individual selection"}
            </div>
          </div>
        </div>
      </SectionCard>

      {student ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Core + Early Years: automatic */}
          <SectionCard
            noPadding
            title={curriculum.section === "Early Years" ? "Learning-area coverage (automatic)" : "Core subjects (automatic)"}
            description={
              curriculum.section === "Early Years"
                ? "Every learning area of the class curriculum applies to the learner — created automatically on enrolment."
                : "Registered automatically from the class curriculum for every enrolled student."
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead className="w-16">Code</TableHead>
                  <TableHead className="w-24 pr-4">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coreItems.map((ci) => {
                  const item = itemById({ items }, ci.itemId);
                  if (!item) return null;
                  const reg = registrations.find(
                    (r) => r.classId === classId && r.studentId === student.id && r.itemId === ci.itemId && r.academicYear === YEAR,
                  );
                  return (
                    <TableRow key={ci.itemId}>
                      <TableCell className="pl-4 text-compact">{item.name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="pr-4">
                        {reg?.status === "active" ? (
                          <Badge variant="secondary" className="font-normal">Registered</Badge>
                        ) : reg?.status === "dropped" ? (
                          <Badge variant="outline" className="font-normal text-muted-foreground">Dropped (history)</Badge>
                        ) : (
                          <Badge variant="destructive" className="font-normal">Missing</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Optional selection */}
          <SectionCard
            noPadding
            title="Optional subjects"
            description="Select eligible optionals and save. Validation checks duplicates, curriculum eligibility and combination rules."
            actions={
              <Button size="sm" className="gap-1.5" disabled={selected.length === 0 || (validation?.errors.length ?? 0) > 0}
                onClick={() => {
                  const r = registerSubjects(student.id, classId, selected, { source: "individual" });
                  if (!r.ok) {
                    toast({ title: "Cannot register", description: r.error, variant: "destructive" });
                    return;
                  }
                  toast({ title: "Subjects registered", description: `${selected.length} optional subject(s) registered for ${student.name}.` });
                  setSelected([]);
                }}>
              <CheckCircle2 className="size-4" /> Save selection
              </Button>
            }
          >
            {optionalItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No optional subjects in this class curriculum.
              </p>
            ) : (
              <div className="grid gap-2 p-4">
                {optionalItems.map((ci) => {
                  const item = itemById({ items }, ci.itemId);
                  if (!item) return null;
                  const isActive = activeSet.has(ci.itemId);
                  return (
                    <label key={ci.itemId} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                      <span className="flex items-center gap-2.5">
                        <Checkbox
                          checked={isActive || selected.includes(ci.itemId)}
                          disabled={isActive}
                          onCheckedChange={() =>
                            setSelected((s) =>
                              s.includes(ci.itemId) ? s.filter((x) => x !== ci.itemId) : [...s, ci.itemId],
                            )
                          }
                        />
                        <span>
                          <span className="text-compact font-medium text-foreground">{item.name}</span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">{item.code}</span>
                        </span>
                      </span>
                      {isActive ? <Badge variant="secondary" className="font-normal">Registered</Badge> : null}
                    </label>
                  );
                })}
              </div>
            )}
            {validation && validation.errors.length > 0 ? (
              <div className="border-t px-4 py-3">
                {validation.errors.map((e, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {e}
                  </p>
                ))}
              </div>
            ) : null}
          </SectionCard>
        </div>
      ) : (
        <SectionCard>
          <p className="py-10 text-center text-sm text-muted-foreground">Choose a student to view their registration.</p>
        </SectionCard>
      )}

      {student && activeItemIds.length > 0 ? (
        <SectionCard
          noPadding
          title={`Registration record — ${student.name}`}
          description="Dropping keeps the historical row (audit-safe). The student can be re-registered at any time."
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Item</TableHead>
                <TableHead className="w-24">Source</TableHead>
                <TableHead className="w-28">Registered</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-24 pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations
                .filter((r) => r.classId === classId && r.studentId === student.id && r.academicYear === YEAR)
                .map((r) => {
                  const item = itemById({ items }, r.itemId);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="pl-4 text-compact">{item?.name ?? r.itemId}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {r.source === "auto-core" ? "auto (core)" :
                           r.source === "auto-area" ? "auto (area)" :
                           r.source === "combination" ? "combination" : r.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs tabular text-muted-foreground">{r.registeredAt.slice(0, 10)}</TableCell>
                      <TableCell>
                        {r.status === "active" ? (
                          <Badge variant="secondary" className="font-normal">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-muted-foreground">Dropped</Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        {r.status === "active" && r.classification === "optional" ? (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              const res = dropRegistration(r.id);
                              if (!res.ok) toast({ title: "Cannot drop", description: res.error, variant: "destructive" });
                              else toast({ title: "Registration dropped", description: "The historical record is kept." });
                            }}>
                            Drop
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}
    </div>
  );
}

/* ================================================================
 * Combination registration
 * ================================================================ */

function CombinationRegistration({ classId }: { classId: string }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const combinations = useAcademicAdminStore((s) => s.combinations);
  const items = useAcademicAdminStore((s) => s.items);
  const registerSubjects = useAcademicAdminStore((s) => s.registerStudentSubjects);
  const bulkRegister = useAcademicAdminStore((s) => s.bulkRegisterClass);

  const [studentId, setStudentId] = useState("");
  const [combinationId, setCombinationId] = useState("");

  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const students = useMemo(() => studentsInClass(classId), [classId]);
  const student = students.find((s) => s.id === studentId);
  const levelCombos = combinations.filter((c) => c.level === curriculum?.level && c.status === "active");
  const combo = combinations.find((c) => c.id === combinationId);

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Student</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="w-full" aria-label="Student"><SelectValue placeholder="Choose student…" /></SelectTrigger>
              <SelectContent>
                {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} · {s.admissionNo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Approved combination ({curriculum?.level})</Label>
            <Select value={combinationId} onValueChange={setCombinationId}>
              <SelectTrigger className="w-full" aria-label="Combination"><SelectValue placeholder="Choose combination…" /></SelectTrigger>
              <SelectContent>
                {levelCombos.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {combo ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Includes:</span>
            {combo.itemIds.map((id) => (
              <Badge key={id} variant="secondary" className="font-normal">{items.find((i) => i.id === id)?.name ?? id}</Badge>
            ))}
            <span className="ml-auto text-xs text-muted-foreground">
              min {combo.minSelections ?? "–"} · max {combo.maxSelections ?? "–"}
            </span>
          </div>
        ) : null}
      </SectionCard>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" className="gap-1.5" disabled={!student || !combo}
          onClick={() => {
            if (!student || !combo) return;
            const r = registerSubjects(student.id, classId, combo.itemIds, { combinationId: combo.id, source: "combination" });
            if (!r.ok) {
              toast({ title: "Cannot register combination", description: r.error, variant: "destructive" });
              return;
            }
            toast({ title: "Combination registered", description: `${combo.name} registered for ${student.name}.` });
          }}>
          <ClipboardList className="size-4" /> Register student through combination
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={!combo}
          onClick={() => {
            if (!combo) return;
            const byStudent: Record<string, string | null> = {};
            for (const s of students) byStudent[s.id] = combo.id;
            const r = bulkRegister(classId, YEAR, { combinationIdByStudent: byStudent });
            if (!r.ok) {
              toast({ title: "Bulk registration failed", description: r.error, variant: "destructive" });
              return;
            }
            toast({ title: "Bulk combination applied", description: `${r.registered} registration rows upserted for the whole class.` });
          }}>
          <Users className="size-4" /> Apply to the whole class
        </Button>
      </div>

      <SectionCard
        noPadding
        title="Validation summary"
        description="Registration guards: curriculum eligibility, combination membership, min/max selections and duplicate prevention."
      >
        <div className="grid gap-2 p-4 text-compact text-muted-foreground">
          <ValidationRow ok text="Duplicate active registrations are rejected (one relational row per student-subject)." />
          <ValidationRow ok text="Optional subjects outside the class curriculum are rejected." />
          <ValidationRow ok text="Combination membership and level are enforced." />
          <ValidationRow ok text="Historical registrations are preserved on drop or class transfer." />
        </div>
      </SectionCard>
    </div>
  );
}

function ValidationRow({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p className="flex items-start gap-2">
      {ok ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-4 text-destructive" />}
      {text}
    </p>
  );
}

/* ================================================================
 * Bulk registration
 * ================================================================ */

function BulkRegistration({ classId }: { classId: string }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const registrations = useAcademicAdminStore((s) => s.registrations);
  const items = useAcademicAdminStore((s) => s.items);
  const bulkRegister = useAcademicAdminStore((s) => s.bulkRegisterClass);

  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const students = useMemo(() => studentsInClass(classId), [classId]);

  const coverage = students.map((s) => {
    const active = registrations.filter(
      (r) => r.classId === classId && r.studentId === s.id && r.status === "active" && r.academicYear === YEAR,
    );
    const missing = (curriculum?.items ?? []).filter((ci) => !active.some((r) => r.itemId === ci.itemId));
    return { student: s, count: active.length, missing };
  });
  const fullyRegistered = coverage.filter((c) => c.missing.length === 0).length;

  return (
    <div className="space-y-4">
      <SectionCard
        title={`Bulk registration — ${classById(classId)?.name ?? classId}`}
        description="Registers every enrolled student for the class curriculum's core subjects (and Early Years learning areas). Existing rows are upserted; nothing is deleted."
        actions={
          <Button size="sm" className="gap-1.5" disabled={!curriculum}
            onClick={() => {
              const r = bulkRegister(classId, YEAR);
              if (!r.ok) {
                toast({ title: "Bulk registration failed", description: r.error, variant: "destructive" });
                return;
              }
              toast({ title: "Bulk compulsory registration complete", description: `${r.registered} rows upserted. Optional selections stay per student.` });
            }}>
            <Users className="size-4" /> Run bulk registration
          </Button>
        }
      >
        <p className="px-4 py-3 text-compact text-muted-foreground">
          {fullyRegistered}/{students.length} students currently hold every curriculum item. The table below is the
          missing-registration report.
        </p>
      </SectionCard>

      <SectionCard noPadding title="Missing registration report">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">Student</TableHead>
              <TableHead className="w-28 text-center">Registered</TableHead>
              <TableHead className="min-w-56 pr-4">Missing items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {coverage.map(({ student, count, missing }) => (
              <TableRow key={student.id}>
                <TableCell className="pl-4 text-compact">{student.name}</TableCell>
                <TableCell className="text-center text-compact tabular">{count} / {curriculum?.items.length ?? 0}</TableCell>
                <TableCell className="pr-4">
                  {missing.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-compact text-emerald-600">
                      <CheckCircle2 className="size-3.5" /> Complete
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {missing.map((ci) => (
                        <Badge key={ci.itemId} variant="outline" className="font-normal text-destructive">
                          {itemById({ items }, ci.itemId)?.name ?? ci.itemId}
                        </Badge>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}

/* ================================================================
 * Audit trail
 * ================================================================ */

function AuditTrail() {
  useAcademicAdmin();
  const audit = useAcademicAdminStore((s) => s.audit);
  const rows = [...audit].reverse().slice(0, 12);
  return (
    <SectionCard
      noPadding
      title="Registration & configuration audit trail"
      description="Every mutation in this module is recorded — actor, action, entity and detail."
    >
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-36 pl-4">When</TableHead>
            <TableHead className="w-40">Actor</TableHead>
            <TableHead className="w-40">Action</TableHead>
            <TableHead className="min-w-56 pr-4">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="pl-4 text-xs tabular text-muted-foreground">{a.at.slice(0, 16).replace("T", " ")}</TableCell>
              <TableCell className="text-compact">{a.actor}</TableCell>
              <TableCell><Badge variant="outline" className="font-normal">{a.action}</Badge></TableCell>
              <TableCell className="pr-4 text-compact text-muted-foreground">{a.detail}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </SectionCard>
  );
}
