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
  type SchoolSection,
} from "@/lib/academic-admin";
import { classById, teacherById } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { RotateCcw, Save } from "lucide-react";

const SECTIONS: SchoolSection[] = ["Early Years", "Primary", "Secondary"];
const YEAR = "2026";

/**
 * Assessment Configuration (task §9): per class-item CA/Exam weighting.
 * Values are NOT hardcoded — the curriculum item carries the defaults and
 * an administrator can override them per class subject; marks entry and
 * the report cards read the effective weights.
 */
export default function AssessmentConfigPage() {
  useAcademicAdmin();
  const [section, setSection] = useState<SchoolSection>("Secondary");
  const [level, setLevel] = useState("Form 3");
  const [classId, setClassId] = useState("01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21");

  const levels = levelsForSection(section);
  const sectionClasses = classesForSection(section, level);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Assessment Configuration"
        description="Configure assessment types and weightings per class subject — CA 25 + Exam 75 is the school default, not a rule. Early Years classes use developmental models without numerical marks."
      />
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
      {classId ? <ClassAssessmentEditor classId={classId} /> : null}
    </div>
  );
}

function ClassAssessmentEditor({ classId }: { classId: string }) {
  useAcademicAdmin();
  const { toast } = useToast();
  const curricula = useAcademicAdminStore((s) => s.curricula);
  const adoptions = useAcademicAdminStore((s) => s.adoptions);
  const assignments = useAcademicAdminStore((s) => s.assignments);
  const assessmentOverrides = useAcademicAdminStore((s) => s.assessmentOverrides);
  const items = useAcademicAdminStore((s) => s.items);
  const setOverride = useAcademicAdminStore((s) => s.setAssessmentOverride);
  const clearOverride = useAcademicAdminStore((s) => s.clearAssessmentOverride);

  const curriculum = adoptedCurriculum({ curricula, adoptions }, classId, YEAR);
  const ordered = useMemo(
    () => [...(curriculum?.items ?? [])].sort((a, b) => a.order - b.order),
    [curriculum],
  );

  const [drafts, setDrafts] = useState<Record<string, { ca: string; exam: string }>>({});
  const draftOf = (itemId: string, ca: number, exam: number) =>
    drafts[itemId] ?? { ca: String(ca), exam: String(exam) };

  if (!curriculum) {
    return (
      <SectionCard>
        <p className="py-10 text-center text-sm text-muted-foreground">
          No adopted curriculum for this class — apply one on the Class Subject Allocation page.
        </p>
      </SectionCard>
    );
  }

  const developmental = ordered.filter((ci) => ci.assessment.developmentalModel).length;

  return (
    <SectionCard
      noPadding
      title={`Assessment setup — ${classById(classId)?.name ?? classId}`}
      description="CA and Exam are entered out of 100 each and weighted into the subject total. Every mark-entry grid and report card uses the effective weights below."
    >
      {developmental > 0 ? (
        <p className="border-b bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
          {developmental} learning area(s) use the configurable developmental assessment model — no numerical marks
          apply to them.
        </p>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="min-w-44 pl-4">Subject</TableHead>
            <TableHead className="min-w-40">Teacher</TableHead>
            <TableHead className="w-24 text-center">CA /100</TableHead>
            <TableHead className="w-24 text-center">Exam /100</TableHead>
            <TableHead className="w-20 text-center">Full</TableHead>
            <TableHead className="w-40 pr-4 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordered.map((ci) => {
            const item = items.find((i) => i.id === ci.itemId);
            if (!item) return null;
            const override = assessmentOverrides[`${classId}|${ci.itemId}`];
            const ca = override?.caMarks ?? ci.assessment.caMarks;
            const exam = override?.examMarks ?? ci.assessment.examMarks;
            const draft = draftOf(ci.itemId, ca, exam);
            const isDevelopmental = ci.assessment.developmentalModel !== null;
            const assignment = activeAssignmentFor({ assignments }, classId, ci.itemId, YEAR);
            const nCa = Number.parseInt(draft.ca, 10);
            const nExam = Number.parseInt(draft.exam, 10);
            const valid =
              !isDevelopmental && Number.isFinite(nCa) && Number.isFinite(nExam) && nCa + nExam > 0;
            const dirty = nCa !== ca || nExam !== exam;
            return (
              <TableRow key={ci.itemId}>
                <TableCell className="pl-4">
                  <p className="text-compact font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </TableCell>
                <TableCell className="text-compact text-muted-foreground">
                  {assignment ? teacherById(assignment.teacherId)?.name ?? "—" : <span className="text-destructive">Unassigned</span>}
                </TableCell>
                {isDevelopmental ? (
                  <TableCell colSpan={4} className="text-center text-xs text-muted-foreground">
                    {ci.assessment.developmentalModel?.join(" → ")}
                  </TableCell>
                ) : (
                  <>
                    <TableCell className="text-center">
                      <Input
                        type="number" min={0} max={100} value={draft.ca}
                        onChange={(e) => setDrafts((d) => ({ ...d, [ci.itemId]: { ...draftOf(ci.itemId, ca, exam), ca: e.target.value } }))}
                        className="mx-auto h-8 w-16 text-center text-compact tabular"
                        aria-label={`CA marks for ${item.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number" min={0} max={100} value={draft.exam}
                        onChange={(e) => setDrafts((d) => ({ ...d, [ci.itemId]: { ...draftOf(ci.itemId, ca, exam), exam: e.target.value } }))}
                        className="mx-auto h-8 w-16 text-center text-compact tabular"
                        aria-label={`Exam marks for ${item.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center text-compact font-medium tabular">
                      {(Number.isFinite(nCa) ? nCa : ca) + (Number.isFinite(nExam) ? nExam : exam)}
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {override ? (
                          <Badge variant="secondary" className="font-normal">custom</Badge>
                        ) : (
                          <Badge variant="outline" className="font-normal text-muted-foreground">default</Badge>
                        )}
                        <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs"
                          disabled={!valid || !dirty}
                          onClick={() => {
                            const r = setOverride(classId, ci.itemId, { caMarks: nCa, examMarks: nExam });
                            if (!r.ok) toast({ title: "Cannot save", description: r.error, variant: "destructive" });
                            else toast({ title: "Assessment configured", description: `${item.name}: CA ${nCa} + Exam ${nExam} = ${nCa + nExam}. Marks entry now uses these weights.` });
                            setDrafts((d) => { const c = { ...d }; delete c[ci.itemId]; return c; });
                          }}>
                          <Save className="size-3" /> Save
                        </Button>
                        {override ? (
                          <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              const r = clearOverride(classId, ci.itemId);
                              if (!r.ok) toast({ title: "Cannot reset", description: r.error, variant: "destructive" });
                              else toast({ title: "Reset to curriculum default", description: item.name });
                            }}>
                            <RotateCcw className="size-3" /> Reset
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </SectionCard>
  );
}
