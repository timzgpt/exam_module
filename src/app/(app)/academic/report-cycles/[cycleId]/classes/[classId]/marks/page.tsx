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
import { combinedComponents } from "@/lib/cycle-components";
import {
  classSubjectsFor,
  eligibleStudentsFor,
  getComponents,
  getMarks,
  isPrimaryClass,
  markStatusOf,
  schemeForClass,
  studentsInClass,
  subjectAveragesFor,
  subjectById,
  subjectTeacherOf,
} from "@/lib/demo-data";
import type { MarkStatusCode } from "@/lib/types";
import { averageOf, fmtTotalMark, formatAvg, gradeFor, subjectTotal } from "@/lib/grading";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Keyboard,
  Loader2,
  Percent,
  RotateCcw,
  Save,
  ShieldOff,
  TrendingUp,
} from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

type ParsedCell =
  | { state: "empty" }
  | { state: "valid"; value: number }
  | { state: "code"; code: MarkStatusCode }
  | { state: "invalid" };

const STATUS_MEANING: Record<MarkStatusCode, string> = {
  ABS: "Absent — treated as blank, excluded from averages",
  NA: "Not assessed — treated as blank, excluded from averages",
  NR: "Not reported — treated as blank, excluded from averages",
  PENDING: "Not yet entered — treated as blank",
  DISQ: "Disqualified / malpractice — counted as a real zero (0.0)",
};

function parseCell(raw: string): ParsedCell {
  const t = raw.trim().toUpperCase();
  if (t === "") return { state: "empty" };
  if (t === "ABS" || t === "NA" || t === "NR" || t === "PENDING")
    return { state: "code", code: t };
  if (t === "DISQ") return { state: "code", code: "DISQ" };
  if (!/^\d+(\.\d+)?$/.test(t)) return { state: "invalid" };
  const n = Number(t);
  if (n < 0 || n > 100) return { state: "invalid" };
  return { state: "valid", value: n };
}

interface RowCells {
  ca: string;
  exam: string;
}

/**
 * Subject total + status for a row of the working grid. Weights come from
 * the cycle: combined cycles weight their two exams (e.g. Monthly 25 +
 * Mid-Term 75); plain cycles use the class subject's CA/Exam split.
 */
function rowMark(
  cells: RowCells,
  w1: number,
  w2: number,
): { total: number | null; status: MarkStatusCode | null } {
  const ca = parseCell(cells.ca);
  const exam = parseCell(cells.exam);
  const codeCell = ca.state === "code" ? ca : exam.state === "code" ? exam : null;
  if (codeCell) {
    return { total: codeCell.code === "DISQ" ? 0 : null, status: codeCell.code };
  }
  const caVal = ca.state === "valid" ? ca.value : null;
  const examVal = exam.state === "valid" ? exam.value : null;
  return { total: subjectTotal(caVal, examVal, w1, w2), status: null };
}

export default function MarksEntryPage() {
  const { toast } = useToast();
  const { klass: cls } = useClassContext();
  const { cycle } = useCycleContext();
  const students = useMemo(() => studentsInClass(cls.id), [cls.id]);
  const classSubjects = useMemo(() => classSubjectsFor(cls.id), [cls.id]);

  const first = classSubjects[0];

  const toBaseline = (subjectId: string): Record<string, RowCells> =>
    Object.fromEntries(
      students.map((s) => {
        const comp = getComponents(cls.id, subjectId)[s.id];
        const enrolled = comp?.enrolled ?? true;
        const status = markStatusOf(cls.id, subjectId, s.id);
        if (!enrolled || (comp?.ca === null && comp?.exam === null && comp?.status === null)) {
          return [s.id, { ca: "", exam: "" }];
        }
        if (status) return [s.id, { ca: status, exam: "" }];
        return [s.id, { ca: String(comp?.ca ?? ""), exam: String(comp?.exam ?? "") }];
      }),
    );

  const [subjectId, setSubjectId] = useState<string>(first.subjectId);
  const [baseline, setBaseline] = useState<Record<string, RowCells>>(() => toBaseline(first.subjectId));
  const [working, setWorking] = useState<Record<string, RowCells>>(() => toBaseline(first.subjectId));
  const [saving, setSaving] = useState(false);

  /** Committed totals per subject: seeds the tab badges and updates on save. */
  const [savedBySubject, setSavedBySubject] = useState<Record<string, Record<string, number | null>>>(
    () => Object.fromEntries(classSubjects.map((cs) => [cs.subjectId, { ...getMarks(cls.id, cs.subjectId) }])),
  );

  const classSubject = classSubjects.find((c) => c.subjectId === subjectId) ?? first;
  const subject = subjectById(classSubject.subjectId)!;
  const scheme = schemeForClass(cls.id);
  // Primary (Grades 1-7) uses no points — the grid hides the Points column.
  const isPrimary = isPrimaryClass(cls.id);
  const teacherName = subjectTeacherOf(subject.id, cls.id)?.name ?? "Unassigned";
  // COMBINED cycles (created with two exam components, e.g. Monthly +
  // Mid-Term): the grid shows one column per exam and weights the total by
  // the component weights. Plain cycles keep the classic CA/Exam sheet.
  const combined = combinedComponents(cycle);
  const w1 = combined ? combined[0].weight : classSubject.caMarks;
  const w2 = combined ? combined[1].weight : classSubject.examMarks;
  const colLabel = (i: 0 | 1) => (combined ? combined[i].label : i === 0 ? "CA" : "Exam");

  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const focusCell = (r: number, c: number) => {
    const el = cellRefs.current.get(`${r}-${c}`);
    if (el) {
      el.focus();
      el.select();
    }
  };

  const onCellKeyDown = (e: KeyboardEvent<HTMLInputElement>, studentIndex: number, col: 0 | 1) => {
    const el = e.currentTarget;
    switch (e.key) {
      case "ArrowDown":
      case "Enter": {
        e.preventDefault();
        if (studentIndex + 1 < students.length) focusCell(studentIndex + 1, col);
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        if (studentIndex - 1 >= 0) focusCell(studentIndex - 1, col);
        break;
      }
      case "ArrowLeft": {
        if ((el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0 && col === 1) {
          e.preventDefault();
          focusCell(studentIndex, 0);
        }
        break;
      }
      case "ArrowRight": {
        const len = el.value.length;
        if ((el.selectionStart ?? 0) === len && (el.selectionEnd ?? 0) === len && col === 0) {
          e.preventDefault();
          focusCell(studentIndex, 1);
        }
        break;
      }
      case "Escape": {
        e.preventDefault();
        setWorking((prev) => ({
          ...prev,
          [students[studentIndex].id]: { ...prev[students[studentIndex].id], [col === 0 ? "ca" : "exam"]: "" },
        }));
        break;
      }
    }
  };

  const setCell = (studentId: string, col: 0 | 1, value: string) =>
    setWorking((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [col === 0 ? "ca" : "exam"]: value },
    }));

  const rows = students.map((s, i) => {
    const cells = working[s.id] ?? { ca: "", exam: "" };
    const enrolled = getComponents(cls.id, classSubject.subjectId)[s.id]?.enrolled ?? true;
    return { student: s, index: i, cells, enrolled, mark: rowMark(cells, w1, w2) };
  });

  const entered = rows.filter((r) => r.enrolled && r.mark.total !== null);
  const invalidCount = rows.filter(
    (r) => parseCell(r.cells.ca).state === "invalid" || parseCell(r.cells.exam).state === "invalid",
  ).length;
  const eligibleCount = eligibleStudentsFor(cls.id, classSubject.subjectId).length;
  const enteredPct = eligibleCount ? Math.round((entered.length / eligibleCount) * 100) : 0;
  const classAverage = averageOf(entered.map((r) => r.mark.total as number));

  const dirtyCount = useMemo(
    () =>
      students.filter((s) => {
        const base = baseline[s.id] ?? { ca: "", exam: "" };
        const work = working[s.id] ?? { ca: "", exam: "" };
        return (
          work.ca.trim().toUpperCase() !== base.ca.trim().toUpperCase() ||
          work.exam.trim().toUpperCase() !== base.exam.trim().toUpperCase()
        );
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
  const topSubject = topSubjectStat ? subjectById(topSubjectStat.subjectId) : undefined;

  const switchSubject = (id: string) => {
    setSubjectId(id);
    const base = toBaseline(id);
    setBaseline(base);
    setWorking(base);
  };

  const reset = () => {
    setWorking(baseline);
    toast({ title: "Changes discarded", description: `The ${subject.name} sheet was restored to its last saved state.` });
  };

  const save = () => {
    if (saving || dirtyCount === 0) return;
    setSaving(true);
    const committed: Record<string, number | null> = {};
    let changed = 0;
    for (const s of students) {
      const prev = getMarks(cls.id, subject.id)[s.id] ?? null;
      const next = rowMark(working[s.id] ?? { ca: "", exam: "" }, w1, w2).total;
      if (next !== prev) changed += 1;
      committed[s.id] = next;
    }
    window.setTimeout(() => {
      const base = toBaseline(subject.id);
      setBaseline(base);
      setWorking(base);
      setSavedBySubject((prev) => ({ ...prev, [subject.id]: committed }));
      setSaving(false);
      toast({
        title: "Marks saved",
        description: `Saved ${changed} changed totals for ${subject.name}: ${cls.name}.`,
      });
    }, 700);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Marks entry: ${cls.name}`}
        description={`${cycle.name} · ${
          combined
            ? `a combined cycle — ${combined[0].label} and ${combined[1].label} are entered out of 100 and weighted ${w1} + ${w2}`
            : `CA and Exam are entered out of 100 and weighted by the class subject (${classSubject.caMarks} + ${classSubject.examMarks})`
        }. Type ABS, NA, NR, PENDING or DISQ in place of a number · Arrow keys move between cells · Esc clears.`}
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
          hint={`${entered.length} of ${eligibleCount} eligible students · ${subject.name}`}
        />
        <StatCard
          label="Class average"
          value={entered.length > 0 ? formatAvg(classAverage) : "-"}
          icon={Percent}
          hint={`${subject.name} · entered marks only, blanks excluded`}
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
        description={`${subject.name} (${subject.code}) · ${teacherName} · ${combined ? `${combined[0].label} ${w1} + ${combined[1].label} ${w2} = 100` : `CA ${classSubject.caMarks} + Exam ${classSubject.examMarks} = ${classSubject.fullMarks}`} · ${classSubject.examPapers} paper${classSubject.examPapers > 1 ? "s" : ""}`}
      >
        {/* Subject selector — order follows the Class subjects page */}
        <div className="border-b border-border/70 px-4 py-3">
          <div className="overflow-x-auto">
            <Tabs value={subjectId} onValueChange={switchSubject}>
              <TabsList className="h-9 w-max">
                {classSubjects.map((cs) => {
                  const saved = savedBySubject[cs.subjectId] ?? {};
                  const eligible = eligibleStudentsFor(cls.id, cs.subjectId).length;
                  const done = eligibleStudentsFor(cls.id, cs.subjectId).filter((s) => saved[s.id] !== null).length;
                  return (
                    <TabsTrigger key={cs.subjectId} value={cs.subjectId} className="h-8 gap-1.5 px-3 text-xs">
                      {subjectById(cs.subjectId)?.name}
                      {cs.type === "subsidiary" ? (
                        <span className="text-3xs font-medium uppercase tracking-wide text-muted-foreground">subs</span>
                      ) : null}
                      <Badge
                        variant="outline"
                        className="h-4.5 rounded-full px-1.5 text-3xs font-medium tabular text-muted-foreground"
                      >
                        {done}/{eligible}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {classSubject.type === "core"
              ? "Core subject — compulsory for every student in the class."
              : "Subsidiary (optional) subject — enrolled students only; students not taking it show “—”."}
          </p>
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
                <TableHead className="text-center">
                  {colLabel(0)} /100
                  <span className="block text-3xs font-medium tracking-wide text-muted-foreground">
                    {w1} %
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  {colLabel(1)} /100
                  <span className="block text-3xs font-medium tracking-wide text-muted-foreground">
                    {w2} %
                  </span>
                </TableHead>
                <TableHead className="text-center">Total /100</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                {!isPrimary ? <TableHead className="text-center">Points</TableHead> : null}
                <TableHead className="min-w-55">Status / remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ student, index, cells, enrolled, mark }) => {
                const invalid =
                  parseCell(cells.ca).state === "invalid" || parseCell(cells.exam).state === "invalid";
                const g = mark.total !== null ? gradeFor(mark.total, scheme) : undefined;
                return (
                  <TableRow key={student.id} className={cn(!enrolled && "opacity-55")}>
                    <TableCell className="sticky left-0 w-10 border-r border-border/40 bg-card text-center text-xs tabular text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="sticky left-10 border-r border-border/40 bg-card pl-3">
                      <p className="whitespace-nowrap text-compact font-medium text-foreground">{student.name}</p>
                      {!enrolled ? (
                        <p className="text-2xs text-muted-foreground">Not enrolled</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs tabular text-muted-foreground">{student.admissionNo}</TableCell>
                    <TableCell className="text-center">
                      <Input
                        value={enrolled ? cells.ca : ""}
                        onChange={(e) => setCell(student.id, 0, e.target.value)}
                        onKeyDown={(e) => onCellKeyDown(e, index, 0)}
                        ref={(el) => {
                          const key = `${index}-0`;
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        data-r={index}
                        data-c={0}
                        disabled={!enrolled}
                        aria-invalid={parseCell(cells.ca).state === "invalid"}
                        aria-label={`${colLabel(0)} mark for ${student.name}`}
                        placeholder="-"
                        className={cn(
                          "mx-auto h-8 w-16 text-center text-compact tabular",
                          parseCell(cells.ca).state === "invalid" &&
                            "border-destructive ring-destructive/30 focus-visible:ring-destructive/30",
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        value={enrolled ? cells.exam : ""}
                        onChange={(e) => setCell(student.id, 1, e.target.value)}
                        onKeyDown={(e) => onCellKeyDown(e, index, 1)}
                        ref={(el) => {
                          const key = `${index}-1`;
                          if (el) cellRefs.current.set(key, el);
                          else cellRefs.current.delete(key);
                        }}
                        data-r={index}
                        data-c={1}
                        disabled={!enrolled}
                        aria-invalid={parseCell(cells.exam).state === "invalid"}
                        aria-label={`${colLabel(1)} mark for ${student.name}`}
                        placeholder="-"
                        className={cn(
                          "mx-auto h-8 w-16 text-center text-compact tabular",
                          parseCell(cells.exam).state === "invalid" &&
                            "border-destructive ring-destructive/30 focus-visible:ring-destructive/30",
                        )}
                      />
                    </TableCell>
                    <TableCell className="text-center text-compact font-medium tabular">
                      {!enrolled ? (
                        <span className="text-muted-foreground">—</span>
                      ) : mark.total !== null ? (
                        fmtTotalMark(mark.total)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {g ? <GradePill grade={g.grade} /> : <span className="text-compact text-muted-foreground">-</span>}
                    </TableCell>
                    {!isPrimary ? (
                      <TableCell className="text-center text-compact tabular">
                        {g ? (
                          <span className="text-foreground">{g.points}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-compact">
                      {mark.status ? (
                        <span
                          className="inline-flex items-center gap-1.5"
                          title={STATUS_MEANING[mark.status]}
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-1.5 font-mono text-2xs",
                              mark.status === "DISQ"
                                ? "border-destructive/40 text-destructive"
                                : "text-muted-foreground",
                            )}
                          >
                            {mark.status === "DISQ" ? <ShieldOff className="size-3" /> : null}
                            {mark.status}
                          </Badge>
                          <span className="text-2xs text-muted-foreground">{STATUS_MEANING[mark.status]}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{g?.remark ?? "-"}</span>
                      )}
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
            Entered <span className="font-medium text-foreground">{entered.length}/{eligibleCount}</span>
          </span>
          <span className="tabular">
            Class average{" "}
            <span className="font-medium text-foreground">
              {entered.length > 0 ? formatAvg(classAverage) : "-"}
            </span>{" "}
            (entered marks only)
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
