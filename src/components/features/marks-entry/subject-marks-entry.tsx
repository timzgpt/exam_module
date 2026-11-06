"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GradePill } from "@/components/shared/grade-pill";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
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
import { useAppContext, selectCycles } from "@/lib/store";
import { combinedComponents } from "@/lib/cycle-components";
import {
  classById,
  classSubjectsFor,
  eligibleStudentsFor,
  getComponents,
  getMarks,
  isPrimaryClass,
  markStatusOf,
  schemeForClass,
  studentsInClass,
  subjectById,
  subjectTeacherOf,
} from "@/lib/demo-data";
import {
  assignedSubjectIdsForClass,
  canEditSubject,
  subjectTeachers,
  useViewer,
  viewerLabel,
  visibleClassesForViewer,
  type Viewer,
} from "@/lib/viewer";
import { averageOf, fmtTotalMark, formatAvg, gradeFor, subjectTotal } from "@/lib/grading";
import { cn } from "@/lib/utils";
import type { ClassRoom, MarkStatusCode, ReportCycle } from "@/lib/types";
import {
  ClipboardList,
  Keyboard,
  Loader2,
  Lock,
  Percent,
  RotateCcw,
  Save,
  Search,
  ShieldOff,
  UserCog,
} from "lucide-react";

/* ================================================================
 * Shared cell parsing + grading (unchanged calculation engine)
 * ================================================================ */

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

/** The section letter of a class, derived from its name minus the level. */
function sectionOf(cls: ClassRoom): string {
  const s = cls.name.slice(cls.level.length).trim();
  return s.length > 0 ? s : "—";
}

const EXAM_GROUP_ORDER: ReportCycle["kind"][] = ["monthly", "mid-term", "terminal", "annual"];
const EXAM_GROUP_LABEL: Record<ReportCycle["kind"], string> = {
  monthly: "Monthly Test",
  "mid-term": "Mid-Term",
  terminal: "Terminal",
  annual: "Annual",
};

/* ================================================================
 * Subject-by-subject marks entry (task §2–§7)
 * ================================================================ */

export function SubjectMarksEntry({
  cycle,
  classId: routeClassId,
}: {
  cycle: ReportCycle;
  classId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const subjectParam = searchParams.get("subject") ?? "";

  // Persisted demo viewer (role). Rehydrates after mount like the other stores.
  useEffect(() => {
    void useViewer.persist.rehydrate();
  }, []);
  const role = useViewer((s) => s.role);
  const teacherId = useViewer((s) => s.teacherId);
  const setViewer = useViewer((s) => s.setViewer);
  const viewer: Viewer = useMemo(() => ({ role, teacherId }), [role, teacherId]);

  const setCycle = useAppContext((s) => s.setCycle);
  const setClass = useAppContext((s) => s.setClass);
  const createdCycles = useAppContext((s) => s.createdCycles);
  const cycleOverrides = useAppContext((s) => s.cycleOverrides);
  const deletedCycleIds = useAppContext((s) => s.deletedCycleIds);
  const allCycles = useMemo(
    () => selectCycles({ createdCycles, cycleOverrides, deletedCycleIds }),
    [createdCycles, cycleOverrides, deletedCycleIds],
  );

  const routeClass = classById(routeClassId);
  const visibleClasses = useMemo(() => visibleClassesForViewer(viewer), [viewer]);

  // ── Filter draft (committed only on Search via navigation) ──────
  const computeDraft = () => ({
    examGroup: cycle.kind,
    examId: cycle.id,
    classLevel: routeClass?.level ?? visibleClasses[0]?.level ?? "",
    section: routeClass ? sectionOf(routeClass) : visibleClasses[0] ? sectionOf(visibleClasses[0]) : "",
    subjectId: subjectParam,
  });
  // Re-sync the draft to the route during render when the route changes
  // (React's "adjust state when a prop changes" pattern — no effect).
  const routeKey = `${cycle.id}|${cycle.kind}|${routeClassId}|${subjectParam}`;
  const [draft, setDraft] = useState(computeDraft);
  const [lastRouteKey, setLastRouteKey] = useState(routeKey);
  if (routeKey !== lastRouteKey) {
    setLastRouteKey(routeKey);
    setDraft(computeDraft());
  }

  // ── Dependent option lists (scoped by viewer role) ──────────────
  const examGroups = useMemo(() => {
    const kinds = new Set(allCycles.map((c) => c.kind));
    return EXAM_GROUP_ORDER.filter((k) => kinds.has(k));
  }, [allCycles]);
  const examsInGroup = useMemo(
    () => allCycles.filter((c) => c.kind === draft.examGroup),
    [allCycles, draft.examGroup],
  );
  const classLevels = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of visibleClasses) {
      if (!seen.has(c.level)) {
        seen.add(c.level);
        out.push(c.level);
      }
    }
    return out;
  }, [visibleClasses]);
  const sectionsForLevel = useMemo(
    () => visibleClasses.filter((c) => c.level === draft.classLevel).map(sectionOf),
    [visibleClasses, draft.classLevel],
  );
  const resolvedClass = useMemo(
    () =>
      visibleClasses.find(
        (c) => c.level === draft.classLevel && sectionOf(c) === draft.section,
      ),
    [visibleClasses, draft.classLevel, draft.section],
  );
  const subjectOptions = useMemo(
    () => (resolvedClass ? assignedSubjectIdsForClass(viewer, resolvedClass.id) : []),
    [resolvedClass, viewer],
  );

  const selectedExam = allCycles.find((c) => c.id === draft.examId) ?? cycle;

  // ── Dependent setters (reset downstream selections) ─────────────
  const pickExamGroup = (g: string) => {
    const group = g as ReportCycle["kind"];
    const first = allCycles.find((c) => c.kind === group);
    setDraft((d) => ({ ...d, examGroup: group, examId: first?.id ?? d.examId }));
  };
  const pickExam = (id: string) => setDraft((d) => ({ ...d, examId: id }));
  const pickLevel = (level: string) => {
    const firstSection = visibleClasses.filter((c) => c.level === level).map(sectionOf)[0] ?? "";
    setDraft((d) => ({ ...d, classLevel: level, section: firstSection, subjectId: "" }));
  };
  const pickSection = (s: string) => setDraft((d) => ({ ...d, section: s, subjectId: "" }));
  const pickSubject = (id: string) => setDraft((d) => ({ ...d, subjectId: id }));

  const canSearch = !!resolvedClass && !!draft.subjectId;
  const onSearch = () => {
    if (!resolvedClass || !draft.subjectId) return;
    setCycle(draft.examId);
    setClass(resolvedClass.id);
    router.push(
      `/academic/report-cycles/${draft.examId}/classes/${resolvedClass.id}/marks?subject=${draft.subjectId}`,
    );
  };

  // ── What is actually loaded (from the committed route) ──────────
  const loadedValid =
    !!subjectParam &&
    !!routeClass &&
    classSubjectsFor(routeClassId).some((cs) => cs.subjectId === subjectParam);
  const loadedPermitted = loadedValid && canEditSubject(viewer, routeClassId, subjectParam);

  const changeSubject = () => router.push(pathname);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marks entry"
        description="Enter marks one subject at a time. Choose the exam, class, section and subject, then load the sheet."
        actions={<ViewerSwitcher role={role} teacherId={teacherId} onChange={setViewer} />}
      />

      {/* ── Filter panel ─────────────────────────────────────────── */}
      <SectionCard>
        {/* Examination gets the widest track so full cycle names fit;
            every field can still shrink (min-w-0) and ellipsize. Six
            across only from xl — md/lg use three pairs per row. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,1.1fr)]">
          <FilterField label="Exam Group">
            <Select value={draft.examGroup} onValueChange={pickExamGroup}>
              <SelectTrigger className="w-full min-w-0" aria-label="Exam Group"><SelectValue /></SelectTrigger>
              <SelectContent>
                {examGroups.map((g) => (
                  <SelectItem key={g} value={g}>{EXAM_GROUP_LABEL[g]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Examination">
            <Select value={draft.examId} onValueChange={pickExam}>
              <SelectTrigger className="w-full min-w-0" aria-label="Examination"><SelectValue /></SelectTrigger>
              <SelectContent>
                {examsInGroup.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Session">
            <div
              title={`${selectedExam.academicYear} · ${selectedExam.term}`}
              className="flex h-9 w-full min-w-0 items-center overflow-hidden rounded-md border border-input bg-muted/40 px-3 text-compact whitespace-nowrap text-foreground"
            >
              <span className="truncate">
                {selectedExam.academicYear} · {selectedExam.term}
              </span>
            </div>
          </FilterField>

          <FilterField label="Class">
            <Select value={draft.classLevel} onValueChange={pickLevel}>
              <SelectTrigger className="w-full min-w-0" aria-label="Class"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {classLevels.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Section">
            <Select value={draft.section} onValueChange={pickSection}>
              <SelectTrigger className="w-full min-w-0" aria-label="Section"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {sectionsForLevel.map((s) => (
                  <SelectItem key={s} value={s}>Section {s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>

          <FilterField label="Subject">
            <Select value={draft.subjectId || undefined} onValueChange={pickSubject}>
              <SelectTrigger className="w-full min-w-0" aria-label="Subject"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {subjectOptions.length === 0 ? (
                  <SelectItem value="none" disabled>No subjects assigned</SelectItem>
                ) : (
                  subjectOptions.map((sid) => (
                    <SelectItem key={sid} value={sid}>{subjectById(sid)?.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-2xs text-muted-foreground">
            {role === "subject-teacher"
              ? "You see only the subjects assigned to you."
              : "Select a subject to load its mark sheet."}
          </p>
          <Button className="gap-1.5" onClick={onSearch} disabled={!canSearch}>
            <Search className="size-4" /> Search
          </Button>
        </div>
      </SectionCard>

      {/* ── Result: workspace, blocked, or empty state ───────────── */}
      {subjectParam && loadedPermitted && routeClass ? (
        <SubjectMarkSheet
          key={`${routeClass.id}|${subjectParam}`}
          cls={routeClass}
          cycle={cycle}
          subjectId={subjectParam}
          onChangeSubject={changeSubject}
        />
      ) : subjectParam && loadedValid && !loadedPermitted ? (
        <NotAuthorised onChangeSubject={changeSubject} />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label} <span className="text-destructive">*</span>
      </Label>
      {children}
    </div>
  );
}

function ViewerSwitcher({
  role,
  teacherId,
  onChange,
}: {
  role: Viewer["role"];
  teacherId: string | null;
  onChange: (role: Viewer["role"], teacherId?: string | null) => void;
}) {
  const value = role === "subject-teacher" && teacherId ? `t:${teacherId}` : role;
  return (
    <div className="flex items-center gap-2">
      <UserCog className="size-4 text-muted-foreground" />
      <Label className="text-xs text-muted-foreground">Viewing as</Label>
      <Select
        value={value}
        onValueChange={(v) =>
          v.startsWith("t:")
            ? onChange("subject-teacher", v.slice(2))
            : onChange(v as Viewer["role"])
        }
      >
        <SelectTrigger className="h-8 w-60 text-compact" aria-label="Viewing as role">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="academic-master">Academic Master (all subjects)</SelectItem>
          <SelectItem value="administrator">Administrator</SelectItem>
          {subjectTeachers().map((t) => (
            <SelectItem key={t.id} value={`t:${t.id}`}>{t.name} · Subject Teacher</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyState() {
  return (
    <SectionCard>
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted">
          <Search className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-compact font-medium text-foreground">No subject loaded</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Choose the examination, class, section and subject above, then press Search to open that
            subject&apos;s mark sheet. Only one subject is shown at a time.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}

function NotAuthorised({ onChangeSubject }: { onChangeSubject: () => void }) {
  return (
    <SectionCard>
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <Lock className="size-6 text-destructive" />
        </div>
        <div>
          <p className="text-compact font-medium text-foreground">Subject not assigned to you</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            You can only enter marks for the subjects assigned to you. Pick one of your subjects, or
            ask an Academic Master for access.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onChangeSubject}>Change subject</Button>
      </div>
    </SectionCard>
  );
}

/* ================================================================
 * Single-subject mark sheet (one subject only — task §5)
 * ================================================================ */

function SubjectMarkSheet({
  cls,
  cycle,
  subjectId,
  onChangeSubject,
}: {
  cls: ClassRoom;
  cycle: ReportCycle;
  subjectId: string;
  onChangeSubject: () => void;
}) {
  const { toast } = useToast();
  const students = useMemo(() => studentsInClass(cls.id), [cls.id]);
  const classSubject = classSubjectsFor(cls.id).find((c) => c.subjectId === subjectId)!;
  const subject = subjectById(subjectId)!;
  const scheme = schemeForClass(cls.id);
  const isPrimary = isPrimaryClass(cls.id);
  const teacherName = subjectTeacherOf(subject.id, cls.id)?.name ?? "Unassigned";

  const combined = combinedComponents(cycle);
  const w1 = combined ? combined[0].weight : classSubject.caMarks;
  const w2 = combined ? combined[1].weight : classSubject.examMarks;
  const colLabel = (i: 0 | 1) => (combined ? combined[i].label : i === 0 ? "CA" : "Exam");

  const toBaseline = (): Record<string, RowCells> =>
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

  // This component is remounted (via `key`) when the loaded subject or class
  // changes, so useState initialises fresh from the saved marks each time.
  const [baseline, setBaseline] = useState<Record<string, RowCells>>(toBaseline);
  const [working, setWorking] = useState<Record<string, RowCells>>(toBaseline);
  const [saving, setSaving] = useState(false);

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
      case "Enter":
        e.preventDefault();
        if (studentIndex + 1 < students.length) focusCell(studentIndex + 1, col);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (studentIndex - 1 >= 0) focusCell(studentIndex - 1, col);
        break;
      case "ArrowLeft":
        if ((el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0 && col === 1) {
          e.preventDefault();
          focusCell(studentIndex, 0);
        }
        break;
      case "ArrowRight": {
        const len = el.value.length;
        if ((el.selectionStart ?? 0) === len && (el.selectionEnd ?? 0) === len && col === 0) {
          e.preventDefault();
          focusCell(studentIndex, 1);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        setWorking((prev) => ({
          ...prev,
          [students[studentIndex].id]: {
            ...prev[students[studentIndex].id],
            [col === 0 ? "ca" : "exam"]: "",
          },
        }));
        break;
    }
  };

  const setCell = (studentId: string, col: 0 | 1, value: string) =>
    setWorking((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [col === 0 ? "ca" : "exam"]: value },
    }));

  const rows = students.map((s, i) => {
    const cells = working[s.id] ?? { ca: "", exam: "" };
    const enrolled = getComponents(cls.id, subjectId)[s.id]?.enrolled ?? true;
    return { student: s, index: i, cells, enrolled, mark: rowMark(cells, w1, w2) };
  });

  const entered = rows.filter((r) => r.enrolled && r.mark.total !== null);
  const invalidCount = rows.filter(
    (r) => parseCell(r.cells.ca).state === "invalid" || parseCell(r.cells.exam).state === "invalid",
  ).length;
  const eligibleCount = eligibleStudentsFor(cls.id, subjectId).length;
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

  const reset = () => {
    setWorking(baseline);
    toast({ title: "Changes discarded", description: `The ${subject.name} sheet was restored.` });
  };

  const save = () => {
    if (saving || dirtyCount === 0) return;
    setSaving(true);
    let changed = 0;
    for (const s of students) {
      const prev = getMarks(cls.id, subject.id)[s.id] ?? null;
      const next = rowMark(working[s.id] ?? { ca: "", exam: "" }, w1, w2).total;
      if (next !== prev) changed += 1;
    }
    window.setTimeout(() => {
      const base = toBaseline();
      setBaseline(base);
      setWorking(base);
      setSaving(false);
      toast({
        title: "Marks saved",
        description: `Saved ${changed} changed totals for ${subject.name}: ${cls.name}. Other subjects were not affected.`,
      });
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Loaded-subject banner */}
      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge className="bg-[#5C0A14] text-white">{subject.name}</Badge>
            <span className="text-2xs text-muted-foreground">({subject.code})</span>
            <span className="text-compact text-muted-foreground">·</span>
            <span className="text-compact font-medium text-foreground">{cls.name}</span>
            <span className="text-compact text-muted-foreground">·</span>
            <span className="text-compact text-muted-foreground">
              {cycle.name} · {cycle.academicYear}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-muted-foreground">Teacher: {teacherName}</span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onChangeSubject}>
              <RotateCcw className="size-3.5" /> Change subject
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Entered"
          value={`${enteredPct}%`}
          icon={ClipboardList}
          tone="primary"
          hint={`${entered.length} of ${eligibleCount} eligible · ${subject.name}`}
        />
        <StatCard
          label="Class average"
          value={entered.length > 0 ? formatAvg(classAverage) : "-"}
          icon={Percent}
          hint="Entered marks only, blanks excluded"
        />
        <StatCard
          label="Weighting"
          value={combined ? `${w1} + ${w2}` : `${classSubject.caMarks} + ${classSubject.examMarks}`}
          icon={Percent}
          hint={combined ? `${combined[0].label} + ${combined[1].label} = 100` : "CA + Exam = 100"}
        />
      </div>

      <SectionCard
        noPadding
        title="Mark sheet"
        description={`${subject.name} (${subject.code}) · ${teacherName} · Type ABS, NA, NR, PENDING or DISQ in place of a number · Arrow keys move · Esc clears`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={reset} disabled={dirtyCount === 0 || saving}>
              <RotateCcw className="size-4" /> Reset
            </Button>
            <Button size="sm" className="gap-1.5" onClick={save} disabled={dirtyCount === 0 || saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save marks
            </Button>
          </>
        }
      >
        <div className="[&_[data-slot=table-container]]:max-h-[60vh]">
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
                  <span className="block text-3xs font-medium tracking-wide text-muted-foreground">{w1} %</span>
                </TableHead>
                <TableHead className="text-center">
                  {colLabel(1)} /100
                  <span className="block text-3xs font-medium tracking-wide text-muted-foreground">{w2} %</span>
                </TableHead>
                <TableHead className="text-center">Total /100</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                {!isPrimary ? <TableHead className="text-center">Points</TableHead> : null}
                <TableHead className="min-w-55">Status / remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ student, index, cells, enrolled, mark }) => {
                const g = mark.total !== null ? gradeFor(mark.total, scheme) : undefined;
                return (
                  <TableRow key={student.id} className={cn(!enrolled && "opacity-55")}>
                    <TableCell className="sticky left-0 w-10 border-r border-border/40 bg-card text-center text-xs tabular text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="sticky left-10 border-r border-border/40 bg-card pl-3">
                      <p className="whitespace-nowrap text-compact font-medium text-foreground">{student.name}</p>
                      {!enrolled ? <p className="text-2xs text-muted-foreground">Not enrolled</p> : null}
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
                        {g ? <span className="text-foreground">{g.points}</span> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                    ) : null}
                    <TableCell className="text-compact">
                      {mark.status ? (
                        <span className="inline-flex items-center gap-1.5" title={STATUS_MEANING[mark.status]}>
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-1.5 font-mono text-2xs",
                              mark.status === "DISQ" ? "border-destructive/40 text-destructive" : "text-muted-foreground",
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border/70 px-4 py-3 text-compact text-muted-foreground">
          <span className="tabular">
            Entered <span className="font-medium text-foreground">{entered.length}/{eligibleCount}</span>
          </span>
          <span className="tabular">
            Class average <span className="font-medium text-foreground">{entered.length > 0 ? formatAvg(classAverage) : "-"}</span>
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
              <Keyboard className="size-3.5" /> Arrow keys move · Enter moves down · Esc clears
            </span>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
