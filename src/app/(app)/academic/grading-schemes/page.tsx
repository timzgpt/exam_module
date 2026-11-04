"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { GradePill } from "@/components/shared/grade-pill";
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
import { gradeFor, gradeToneClass } from "@/lib/grading";
import { gradingSchemes as demoSchemes } from "@/lib/demo-data";
import { SCHOOL } from "@/lib/demo-config";
import { cn } from "@/lib/utils";
import { Info, Percent, RotateCcw, Save, SlidersHorizontal, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { GradeBoundary, GradingScheme } from "@/lib/types";

export default function GradingSchemesPage() {
  const { toast } = useToast();
  const [schemes, setSchemes] = useState<GradingScheme[]>(demoSchemes);
  const [selectedId, setSelectedId] = useState<string>(demoSchemes[0].id);
  const [draft, setDraft] = useState<GradeBoundary[]>(demoSchemes[0].boundaries);
  const [simMark, setSimMark] = useState<string>("");

  const scheme = schemes.find((s) => s.id === selectedId) ?? schemes[0];

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(scheme.boundaries),
    [draft, scheme.boundaries],
  );

  const selectScheme = (id: string) => {
    setSelectedId(id);
    const next = schemes.find((s) => s.id === id) ?? schemes[0];
    setDraft(next.boundaries.map((b) => ({ ...b })));
  };

  const resetDraft = () => {
    setDraft(scheme.boundaries.map((b) => ({ ...b })));
    toast({
      title: "Changes discarded",
      description: `${scheme.name} was restored to its saved boundaries.`,
    });
  };

  const saveScheme = () => {
    setSchemes((prev) =>
      prev.map((s) => (s.id === scheme.id ? { ...s, boundaries: draft } : s)),
    );
    toast({
      title: "Scheme saved",
      description: `${scheme.name} boundaries were updated for this session.`,
    });
  };

  const updateBoundary = (index: number, key: keyof GradeBoundary, value: string) => {
    setDraft((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        if (key === "min" || key === "max" || key === "points") {
          const parsed = value === "" ? 0 : Number(value);
          return { ...b, [key]: Number.isNaN(parsed) ? 0 : parsed };
        }
        return { ...b, [key]: value };
      }),
    );
  };

  /* Width of each band segment, proportional to the marks it covers. */
  const spanMin = Math.min(...draft.map((b) => b.min), 0);
  const spanMax = Math.max(...draft.map((b) => b.max), 100);
  const span = spanMax - spanMin || 1;

  /* Grade simulator: evaluates against the edited draft boundaries. */
  const simValue = simMark.trim() === "" ? null : Number(simMark);
  const simValid = simValue !== null && !Number.isNaN(simValue) && simValue >= 0 && simValue <= 100;
  const simGrade = simValid && simValue !== null ? gradeFor(simValue, { ...scheme, boundaries: draft }) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Grading schemes"
        description={`Grade boundaries, points and remarks used to translate marks into grades for ${SCHOOL.academicYear}.`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={resetDraft} disabled={!dirty}>
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button size="sm" className="gap-1.5" onClick={saveScheme} disabled={!dirty}>
              <Save className="size-4" /> Save changes
            </Button>
          </>
        }
      />

      {/* Grade-range band + scheme picker */}
      <SectionCard
        title="Grade band"
        description={`How the 0-100 mark range is split by ${scheme.name}. Segments are sized by the width of each boundary.`}
        actions={
          <div className="w-56">
            {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
            <Select value={scheme.id} onValueChange={selectScheme}>
              <SelectTrigger className="h-8 w-full text-compact">
                <SelectValue placeholder="Select scheme" />
              </SelectTrigger>
              <SelectContent>
                {schemes.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex h-16 w-full overflow-hidden rounded-lg border border-border/80">
            {draft.map((b) => {
              const width = ((b.max - b.min + 1) / span) * 100;
              return (
                <div
                  key={b.grade}
                  style={{ width: `${width}%` }}
                  className={cn(
                    "flex min-w-0 flex-col items-center justify-center border-r border-border/40 last:border-r-0",
                    gradeToneClass(b.grade),
                  )}
                  title={`${b.grade}: ${b.min}-${b.max} (${b.points} pts)`}
                >
                  <span className="text-sm font-semibold leading-none">{b.grade}</span>
                  <span className="mt-1 text-3xs leading-none tabular opacity-80">
                    {b.min}-{b.max}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Percent className="size-3.5" />
              Pass mark: <span className="font-medium text-foreground tabular">{scheme.passMark}</span>
              <span>
                (grade{draft.filter((b) => b.min >= scheme.passMark).length > 1 ? "s" : ""}{" "}
                {draft.filter((b) => b.min >= scheme.passMark).map((b) => b.grade).join(", ")} and above pass)
              </span>
            </span>
            <span>
              Academic year <span className="font-medium text-foreground tabular">{scheme.academicYear}</span>
            </span>
            <span>
              <span className="font-medium text-foreground tabular">{draft.length}</span> boundaries
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wand2 className="size-3.5" /> Points range{" "}
              <span className="font-medium text-foreground tabular">
                {Math.min(...draft.map((b) => b.points))}-{Math.max(...draft.map((b) => b.points))}
              </span>
            </span>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Editable boundaries */}
        <SectionCard
          noPadding
          className="lg:col-span-2"
          title="Boundaries"
          description="Edit the minimum, maximum, points and remark for each grade, then save."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Grade</TableHead>
                  <TableHead>Min</TableHead>
                  <TableHead>Max</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead className="pr-4">Remark</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {draft.map((b, i) => (
                  <TableRow key={b.grade}>
                    <TableCell className="pl-4">
                      <GradePill grade={b.grade} />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        aria-label={`${b.grade} minimum`}
                        className="h-8 w-20 text-compact tabular"
                        value={b.min}
                        onChange={(e) => updateBoundary(i, "min", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        aria-label={`${b.grade} maximum`}
                        className="h-8 w-20 text-compact tabular"
                        value={b.max}
                        onChange={(e) => updateBoundary(i, "max", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        aria-label={`${b.grade} points`}
                        className="h-8 w-16 text-compact tabular"
                        value={b.points}
                        onChange={(e) => updateBoundary(i, "points", e.target.value)}
                      />
                    </TableCell>
                    <TableCell className="pr-4">
                      <Input
                        aria-label={`${b.grade} remark`}
                        className="h-8 min-w-36 text-compact"
                        value={b.remark}
                        onChange={(e) => updateBoundary(i, "remark", e.target.value)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
            {dirty
              ? "You have unsaved edits. Use Save changes or Reset."
              : "Showing the saved boundaries for this scheme."}
          </p>
        </SectionCard>

        {/* Rules + simulator */}
        <div className="space-y-5">
          <SectionCard title="Rules" description="Applied when grading marks in this scheme.">
            <div className="space-y-3.5 text-compact">
              <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-muted-foreground">
                  <SlidersHorizontal className="size-4" /> Pass mark
                </span>
                <span className="font-semibold tabular text-foreground">{scheme.passMark} / 100</span>
              </div>
              <div>
                <p className="font-medium text-foreground">Rounding rule</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Subject marks are entered as whole numbers. Averages are kept to one decimal place and are
                  not rounded up before grading. 79.5 grades as a B, not an A.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Resit policy</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  A student scoring below {scheme.passMark} in any subject sits a resit in week 3 of the
                  following term. The resit mark is recorded alongside the original and capped at{" "}
                  {scheme.passMark} for report purposes.
                </p>
              </div>
              <p className="flex items-start gap-1.5 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Boundaries apply to every subject and class report in {scheme.academicYear}.
              </p>
            </div>
          </SectionCard>

          <SectionCard
            title="Grade simulator"
            description="Type a mark to see the grade it produces with the current draft boundaries."
          >
            <div className="space-y-3">
              <div className="grid gap-1.5">
                <Label htmlFor="sim-mark">Mark (0-100)</Label>
                <Input
                  id="sim-mark"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 72"
                  className="h-9 text-compact tabular"
                  value={simMark}
                  onChange={(e) => setSimMark(e.target.value)}
                />
              </div>
              {simValid && simGrade ? (
                <div className="flex items-center gap-3 rounded-lg border border-border/70 px-3 py-3">
                  <GradePill grade={simGrade.grade} className="size-10 text-base" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{simGrade.remark}</p>
                    <p className="text-xs text-muted-foreground tabular">
                      {simGrade.min}-{simGrade.max} · {simGrade.points}{" "}
                      {simGrade.points === 1 ? "point" : "points"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border/70 px-3 py-3 text-xs text-muted-foreground">
                  {simValue === null
                    ? "Enter a mark to preview its grade, points and remark."
                    : "Mark must be between 0 and 100, and fall inside a boundary range."}
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
