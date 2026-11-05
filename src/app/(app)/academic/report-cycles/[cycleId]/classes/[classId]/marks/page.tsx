"use client";

import { GradePill } from "@/components/shared/grade-pill";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useClassContext, useCycleContext } from "@/hooks/use-academic-context";
import {
  defaultScheme,
  getMarks,
  studentsInClass,
  subjectAveragesFor,
  subjectTeacherOf,
  subjects,
} from "@/lib/demo-data";
import { averageOf, formatAvg, gradeFor } from "@/lib/grading";
import { cn } from "@/lib/utils";
import { ClipboardList, Keyboard, Loader2, Percent, RotateCcw, Save, TrendingUp } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

type ParsedMark = { state: "empty" } | { state: "valid"; value: number } | { state: "invalid" };

function parseMark(raw: string): ParsedMark {
  const t = raw.trim();
  if (t === "") return { state: "empty" };
  if (!/^-?\d+$/.test(t)) return { state: "invalid" };
  const n = Number(t);
  if (n < 0 || n > 100) return { state: "invalid" };
  return { state: "valid", value: n };
}

const toWorking = (baseline: Record<string, number | null>): Record<string, string> =>
  Object.fromEntries(Object.entries(baseline).map(([sid, v]) => [sid, v === null ? "" : String(v)]));

export default function MarksEntryPage() {
  const { toast } = useToast();
  const { klass: cls } = useClassContext();
  const { cycle } = useCycleContext();
  const students = useMemo(() => studentsInClass(cls.id), [cls.id]);

  const [subjectId, setSubjectId] = useState<string>(subjects[0].id);
  const [baseline, setBaseline] = useState<Record<string, number | null>>(
    () => ({ ...getMarks(cls.id, subjects[0].id) }),
  );
  const [working, setWorking] = useState<Record<string, string>>(() =>
    toWorking({ ...getMarks(cls.id, subjects[0].id) }),
  );
  const [saving, setSaving] = useState(false);

  /** Committed marks per subject: seeds the tab badges and updates on save. */
  const [savedBySubject, setSavedBySubject] = useState<Record<string, Record<string, number | null>>>(
    () => Object.fromEntries(subjects.map((s) => [s.id, { ...getMarks(cls.id, s.id) }])),
  );

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];
  const teacherName = subjectTeacherOf(subject.id, cls.id)?.name ?? "Unassigned";

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const focusCell = (r: number, c: number) => {
    const el = cellRefs.current.get(`${r}-${c}`);
    if (el) {
      el.focus();
      el.select();
    }
  };

  const onCellKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    studentIndex: number,
  ) => {
    const el = e.currentTarget;
    const r = Number(el.dataset.r ?? studentIndex);
    const c = Number(el.dataset.c ?? 0);
    switch (e.key) {
      case "ArrowDown":
      case "Enter": {
        e.preventDefault();
        if (r + 1 < students.length) focusCell(r + 1, c);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (r - 1 >= 0) focusCell(r - 1, c);
        break;
      }
      case "ArrowLeft": {
        if ((el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0 && c > 0) {
          e.preventDefault();
          focusCell(r, c - 1);
        }
        break;
      }
      case "ArrowRight": {
        const len = el.value.length;
        if ((el.selectionStart ?? 0) === len && (el.selectionEnd ?? 0) === len) {
          e.preventDefault();
          focusCell(r, c + 1);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setWorking((prev) => ({ ...prev, [students[r].id]: "" }));
        break;
      }
    }
  };

  const parsedRows = useMemo(
    () => students.map((s) => ({ student: s, parsed: parseMark(working[s.id] ?? "") })),
    [students, working],
  );

  const entered = parsedRows.filter((r) => r.parsed.state === "valid");
  const invalidCount = parsedRows.filter((r) => r.parsed.state === "invalid").length;
  const classAverage = averageOf(entered.map((r) => r.parsed.state === "valid" ? r.parsed.value : 0));
  const enteredPct = students.length ? Math.round((entered.length / students.length) * 100) : 0;

  const dirtyCount = useMemo(
    () =>
      students.filter((s) => {
        const p = parseMark(working[s.id] ?? "");
        const base = baseline[s.id] ?? null;
        if (p.state === "empty") return base !== null;
        if (p.state === "invalid") return true;
        return p.value !== base;
      }).length,
    [students, working, baseline],
  );

  const topSubjectStat = useMemo(
    () =>
      subjectAveragesFor(cls.id)
        .filter((st) => st.avg > 0)
        .sort((a, b) => b.avg - a.avg)[0],
    [cls.id],
  );
  const topSubject = topSubjectStat ? subjects.find((s) => s.id === topSubjectStat.subjectId) : undefined;

  const switchSubject = (id: string) => {
    setSubjectId(id);
    const base = { ...getMarks(cls.id, id) };
    setBaseline(base);
    setWorking(toWorking(base));
  };

  const reset = () => {
    setWorking(toWorking(baseline));
    toast({ title: "Changes discarded", description: `The ${subject.name} sheet was restored to its last saved state.` });
  };

  const save = () => {
    if (saving || dirtyCount === 0) return;
    setSaving(true);
    const committed: Record<string, number | null> = {};
    let changed = 0;
    for (const s of students) {
      const p = parseMark(working[s.id] ?? "");
      const next = p.state === "valid" ? p.value : (baseline[s.id] ?? null);
      if (next !== (baseline[s.id] ?? null)) changed += 1;
      committed[s.id] = next;
    }
    window.setTimeout(() => {
      setBaseline(committed);
      setWorking(toWorking(committed));
      setSavedBySubject((prev) => ({ ...prev, [subject.id]: committed }));
      setSaving(false);
      toast({
        title: "Marks saved",
        description: `Saved ${changed} marks for ${subject.name}: ${cls.name}.`,
      });
    }, 700);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Marks entry: ${cls.name}`}
        description={`${cycle.name} · keyboard-friendly sheet: Arrow keys move between cells · Enter saves and moves down · Esc clears.`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={reset}
              disabled={dirtyCount === 0 || saving}
            >
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button size="sm" className="gap-1.5" onClick={save} disabled={dirtyCount === 0 || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save marks
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Entered"
          value={`${enteredPct}%`}
          icon={ClipboardList}
          tone="primary"
          hint={`${entered.length} of ${students.length} students · ${subject.name}`}
        />
        <StatCard
          label="Class average"
          value={entered.length > 0 ? formatAvg(classAverage) : "-"}
          icon={Percent}
          hint={`${subject.name} · entered marks only`}
        />
        <StatCard
          label="Highest subject so far"
          value={topSubjectStat ? formatAvg(topSubjectStat.avg) : "-"}
          icon={TrendingUp}
          tone="success"
          hint={topSubject ? `${topSubject.name} · class mean` : "No marks yet"}
        />
      </div>

      <SectionCard
        noPadding
        title="Mark sheet"
        description={`${subject.name} (${subject.code}) · ${teacherName} · out of 100`}
      >
        {/* Subject selector */}
        <div className="border-b border-border/70 px-4 py-3">
          <div className="overflow-x-auto">
            <Tabs value={subjectId} onValueChange={switchSubject}>
              <TabsList className="h-9 w-max">
                {subjects.map((s) => {
                  const saved = savedBySubject[s.id] ?? {};
                  const done = Object.values(saved).filter((v) => v !== null).length;
                  return (
                    <TabsTrigger key={s.id} value={s.id} className="h-8 gap-1.5 px-3 text-xs">
                      {s.name}
                      <Badge
                        variant="outline"
                        className="h-4.5 rounded-full px-1.5 text-3xs font-medium tabular text-muted-foreground"
                      >
                        {done}/{students.length}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Sheet */}
        <div className="[&_[data-slot=table-container]]:max-h-[62vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="sticky left-0 z-30 w-10 bg-muted/40 text-center">#</TableHead>
                <TableHead className="sticky left-10 z-30 min-w-50 border-r border-border/60 bg-muted/40 pl-3">
                  Student
                </TableHead>
                <TableHead>Adm. no</TableHead>
                <TableHead className="text-center">Mark /100</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-center">Points</TableHead>
                <TableHead className="min-w-55">Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parsedRows.map(({ student, parsed }, i) => {
                const invalid = parsed.state === "invalid";
                const g = parsed.state === "valid" ? gradeFor(parsed.value, defaultScheme) : undefined;
                return (
                  <TableRow key={student.id}>
                    <TableCell className="sticky left-0 w-10 border-r border-border/40 bg-card text-center text-xs tabular text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="sticky left-10 border-r border-border/40 bg-card pl-3">
                      <p className="whitespace-nowrap text-compact font-medium text-foreground">{student.name}</p>
                    </TableCell>
                    <TableCell className="text-xs tabular text-muted-foreground">{student.admissionNo}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        value={working[student.id] ?? ""}
                        onChange={(e) =>
                          setWorking((prev) => ({ ...prev, [student.id]: e.target.value }))
                        }
                        onKeyDown={(e) => onCellKeyDown(e, i)}
                        ref={(el) => {
                          const key = `${i}-0`;
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        data-r={i}
                        data-c={0}
                        inputMode="numeric"
                        aria-invalid={invalid}
                        aria-label={`Mark for ${student.name}`}
                        placeholder="-"
                        className={cn(
                          "mx-auto h-8 w-16 text-center text-compact tabular",
                          invalid && "border-destructive ring-destructive/30 focus-visible:ring-destructive/30",
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      {g ? <GradePill grade={g.grade} /> : <span className="text-compact text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-center text-compact tabular">
                      {g ? (
                        <span className="text-foreground">{g.points}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-compact text-muted-foreground">
                      {g?.remark ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/70 px-4 py-3 text-compact text-muted-foreground">
          <span className="tabular">
            Entered <span className="font-medium text-foreground">{entered.length}/{students.length}</span>
          </span>
          <span className="tabular">
            Class average{" "}
            <span className="font-medium text-foreground">
              {entered.length > 0 ? formatAvg(classAverage) : "-"}
            </span>{" "}
            (entered marks)
          </span>
          {invalidCount > 0 ? (
            <span className="font-medium tabular text-destructive">
              {invalidCount} invalid {invalidCount === 1 ? "cell" : "cells"}
            </span>
          ) : null}
          {dirtyCount > 0 ? (
            <span className="ml-auto inline-flex items-center gap-1.5 font-medium text-warning">
              <span className="size-1.5 rounded-full bg-warning" />
              Unsaved changes · {dirtyCount}
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs">
              <Keyboard className="size-3.5" />
              Arrow keys move · Enter moves down · Esc clears
            </span>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
