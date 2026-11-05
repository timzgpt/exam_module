"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import {
  componentsError,
  cycleName,
  defaultComponents,
  EXAM_KINDS,
  examLabel,
} from "@/lib/cycle-components";
import { DEMO_TODAY, SCHOOL } from "@/lib/demo-config";
import { classes as demoClasses } from "@/lib/demo-data";
import { useAppContext } from "@/lib/store";
import type { CycleComponent, CycleExamKind, ReportCycle } from "@/lib/types";
import { Plus, X } from "lucide-react";

/**
 * "New report cycle" / "Edit report cycle" — one dialog for both flows.
 *
 * A cycle combines exams into one report card: pick the cycle's exam, then
 * build its Components — one row per exam with a label and a weight that
 * sum to 100 %. The school's combinations are "Monthly + Mid-Term" and
 * "Mid-Term + Terminal"; the Annual Exam is the final standalone exam and
 * can never be combined (no Mid-Term + Annual). Report date and School
 * opens are required before the cycle is released, not before it is saved.
 *
 * With a `cycle` prop the dialog opens in EDIT mode: fields are seeded from
 * the cycle, the calendar follows a changed report date (same math as
 * creation) and a plain single-exam cycle stays plain unless its components
 * are edited.
 */

const YEARS = ["2025", "2026", "2027", "2028"];
const TERMS = ["Term 1", "Term 2", "Term 3"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Name label per exam kind — matches the "{Exam} - {year}" convention. */
const NAME_LABELS: Record<CycleExamKind, string> = {
  monthly: "Monthly Test",
  "mid-term": "Mid term",
  terminal: "Terminal Exam",
  annual: "Annual Exam",
};

export function CreateCycleDialog({
  open,
  onOpenChange,
  cycle = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present → edit this cycle instead of creating a new one. */
  cycle?: ReportCycle | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cycle ? "Edit report cycle" : "New report cycle"}</DialogTitle>
          <DialogDescription>
            {cycle
              ? `Update ${cycle.name} — its exams, classes and dates. The cycle's status is kept.`
              : "A cycle combines exams into one report card."}
          </DialogDescription>
        </DialogHeader>

        {/* The form is a separate component so its state is created fresh
            every time the dialog opens (Radix unmounts closed content):
            no effect-based reseeding, no stale edits carried over. */}
        <CycleForm key={cycle?.id ?? "new"} cycle={cycle} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function CycleForm({
  cycle,
  onOpenChange,
}: {
  cycle: ReportCycle | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const addCycle = useAppContext((s) => s.addCycle);
  const updateCycle = useAppContext((s) => s.updateCycle);

  const isEdit = cycle !== null;

  // Seeded once at mount: from the cycle in edit mode, from the blank
  // defaults in create mode. A plain single-exam cycle is seeded with its
  // own 100 % row (NOT the combined default template), so re-saving an
  // untouched plain cycle keeps it plain.
  const [kind, setKind] = useState<CycleExamKind>(cycle?.kind ?? "mid-term");
  const [term, setTerm] = useState(cycle?.term ?? "Term 1");
  const [year, setYear] = useState<string>(cycle?.academicYear ?? SCHOOL.academicYear);
  const [classIds, setClassIds] = useState<string[]>(cycle?.classIds ?? []);
  const [components, setComponents] = useState<CycleComponent[]>(() =>
    cycle
      ? (cycle.components ?? [
          { label: examLabel(cycle.kind), exam: cycle.kind, weight: 100 },
        ])
      : defaultComponents("mid-term"),
  );
  const [reportDate, setReportDate] = useState(cycle?.reportDate ?? "");
  const [schoolOpens, setSchoolOpens] = useState(cycle?.schoolOpensDate ?? "");

  const isAnnual = kind === "annual";
  const canAddComponent = !isAnnual && components.length < 2;
  const error = componentsError(components);
  const namePreview = cycleName(
    kind,
    isAnnual ? [{ label: "Annual", exam: "annual", weight: 100 }] : components,
    year,
  );
  const changeKind = (next: CycleExamKind) => {
    setKind(next);
    // Each exam starts from the school's standard component setup; the
    // Annual Exam is locked to its single 100 % row.
    setComponents(defaultComponents(next));
  };

  const addClass = (id: string) => {
    if (id && !classIds.includes(id)) setClassIds((prev) => [...prev, id]);
  };

  const setComponent = (index: number, patch: Partial<CycleComponent>) =>
    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  // Classes are required for a NEW cycle (marks entry is set up per class);
  // an edit may leave them untouched.
  const saveDisabled =
    !year.trim() || (!isEdit && classIds.length === 0) || error !== null;

  const save = () => {
    if (saveDisabled) return;
    const comps = isAnnual ? defaultComponents("annual") : components;

    if (cycle) {
      // EDIT — identity, status and attendance window are kept; the derived
      // calendar only moves when the report date itself moved (same math as
      // creation: closing = report date, release +14 d, parents' day −7 d).
      const reportMoved = reportDate !== "" && reportDate !== cycle.reportDate;
      const next: ReportCycle = {
        ...cycle,
        name: cycleName(kind, comps, year),
        term,
        academicYear: year.trim(),
        kind,
        reportDate: reportDate || cycle.reportDate,
        ...(reportMoved
          ? {
              endDate: reportDate,
              closingDate: reportDate,
              releaseDate: addDays(reportDate, 14),
              parentsDayDate: addDays(reportDate, -7),
              schoolOpensDate: schoolOpens || addDays(reportDate, 24),
            }
          : {
              endDate: cycle.endDate,
              closingDate: cycle.closingDate,
              releaseDate: cycle.releaseDate,
              parentsDayDate: cycle.parentsDayDate,
              schoolOpensDate: schoolOpens || cycle.schoolOpensDate,
            }),
        // Only combined cycles carry a components array — plain single-exam
        // cycles keep the classic CA/Exam mark sheet.
        ...(comps.length > 1 ? { components: comps } : {}),
        classIds: classIds.length > 0 ? classIds : cycle.classIds,
      };
      updateCycle(next);
      onOpenChange(false);
      toast({
        title: "Cycle updated",
        description: `${next.name} was saved${
          comps.length > 1
            ? ` — marks entry takes one column per exam (${comps
                .map((c) => `${c.label} ${c.weight} %`)
                .join(" + ")}).`
            : "."
        }`,
      });
      return;
    }

    const end = reportDate || addDays(DEMO_TODAY, 28);
    const cycleToCreate: ReportCycle = {
      id: `cy-${Date.now()}`,
      name: cycleName(kind, comps, year),
      term,
      academicYear: year.trim(),
      kind,
      startDate: DEMO_TODAY,
      endDate: end,
      status: "preparation",
      closingDate: end,
      releaseDate: addDays(end, 14),
      parentsDayDate: addDays(end, -7),
      reportDate: reportDate || addDays(end, 3),
      schoolOpensDate: schoolOpens || addDays(end, 24),
      attendanceFrom: DEMO_TODAY,
      attendanceTo: end,
      // Only combined cycles carry a components array — plain single-exam
      // cycles keep the classic CA/Exam mark sheet.
      ...(comps.length > 1 ? { components: comps } : {}),
      classIds,
    };
    addCycle(cycleToCreate);
    onOpenChange(false);
    toast({
      title: "Cycle created",
      description: `${cycleToCreate.name} was added in preparation${
        comps.length > 1
          ? ` — marks entry now takes one column per exam (${comps
              .map((c) => `${c.label} ${c.weight} %`)
              .join(" + ")}).`
          : "."
      }`,
    });
  };

  return (
    <>
      <div className="grid gap-4 py-1">
        {/* Year · Term · Exam */}
        <div className="grid grid-cols-3 gap-3">
          <div className="grid gap-1.5">
            <Label>Academic year</Label>
            {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Term</Label>
            {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Exam</Label>
            {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
            <Select value={kind} onValueChange={(v) => changeKind(v as CycleExamKind)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXAM_KINDS.map((e) => (
                  <SelectItem key={e.kind} value={e.kind}>
                    {NAME_LABELS[e.kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Classes */}
        <div className="grid gap-1.5">
          <Label>
            Classes
            {!isEdit ? <span className="text-destructive"> *</span> : null}
            {isEdit ? (
              <span className="font-normal text-muted-foreground"> — optional</span>
            ) : null}
          </Label>
          {classIds.length === 0 ? (
            <p className="text-xs text-muted-foreground">No classes added yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {classIds.map((id) => {
                const klass = demoClasses.find((c) => c.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-foreground"
                  >
                    {klass?.name ?? id}
                    <button
                      type="button"
                      aria-label={`Remove ${klass?.name ?? id}`}
                      onClick={() => setClassIds((prev) => prev.filter((c) => c !== id))}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
          {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
          <Select value="" onValueChange={addClass}>
            <SelectTrigger className="w-48">
              <Plus className="size-3.5" />
              <SelectValue placeholder="add classes" />
            </SelectTrigger>
            <SelectContent>
              {demoClasses
                .filter((c) => !classIds.includes(c.id))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {/* Components */}
        <div className="rounded-lg border border-border/80 p-3">
          <div className="grid grid-cols-[1.2fr_1.2fr_5rem_3.5rem] items-end gap-2 pb-1.5">
            <Label className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Label
            </Label>
            <Label className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Exam
            </Label>
            <Label className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Weight %
            </Label>
            <span />
          </div>
          <div className="grid gap-2">
            {components.map((comp, i) => {
              const other = components.find((_, j) => j !== i);
              return (
                <div
                  key={i}
                  className="grid grid-cols-[1.2fr_1.2fr_5rem_3.5rem] items-center gap-2"
                >
                  <Input
                    value={comp.label}
                    onChange={(e) => setComponent(i, { label: e.target.value })}
                    aria-label={`Component ${i + 1} label`}
                    className="h-9"
                  />
                  {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
                  <Select
                    value={comp.exam}
                    onValueChange={(v) => setComponent(i, { exam: v as CycleExamKind })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_KINDS.map((e) => {
                        // A second row can never take the Annual Exam: it
                        // is the final standalone exam (no Mid-Term + Annual).
                        const disabled = e.kind === "annual" && components.length > 1;
                        return (
                          <SelectItem
                            key={e.kind}
                            value={e.kind}
                            disabled={disabled || (other ? other.exam === e.kind : false)}
                          >
                            {examLabel(e.kind)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={comp.weight}
                    onChange={(e) => setComponent(i, { weight: Number(e.target.value) || 0 })}
                    aria-label={`Component ${i + 1} weight percent`}
                    className="h-9 text-center tabular"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setComponents((prev) =>
                        prev.length > 1 ? prev.filter((_, j) => j !== i) : prev,
                      )
                    }
                    className="justify-self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
          {canAddComponent ? (
            <Button
              type="button"
              variant="link"
              className="mt-1.5 h-7 gap-1 px-0 text-xs font-semibold text-primary"
              onClick={() =>
                setComponents((prev) => [
                  ...prev,
                  {
                    label: "Terminal",
                    exam: "terminal",
                    weight: 100 - prev.reduce((a, c) => a + c.weight, 0) || 50,
                  },
                ])
              }
            >
              <Plus className="size-3.5" /> Add component
            </Button>
          ) : null}
          {isAnnual ? (
            <p className="mt-1.5 text-xs text-muted-foreground">
              The Annual Exam runs on its own — it cannot be combined with Mid-Term or
              Monthly exams.
            </p>
          ) : null}
          {error && !isAnnual ? (
            <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>
          ) : null}
        </div>

        {/* Report date · School opens */}
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="new-cycle-report-date">Report date</Label>
            <Input
              id="new-cycle-report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="new-cycle-school-opens">School opens</Label>
            <Input
              id="new-cycle-school-opens"
              type="date"
              value={schoolOpens}
              onChange={(e) => setSchoolOpens(e.target.value)}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">
          Required before the cycle is released.
        </p>

        {/* Derived name preview */}
        <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Cycle name ·{" "}
          <span className="font-semibold text-foreground">{namePreview}</span>
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saveDisabled}>
          {isEdit ? "Save changes" : "Save"}
        </Button>
      </DialogFooter>
    </>
  );
}
