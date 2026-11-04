"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, labelForStatus, toneForStatus } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  approvalFor,
  batchRuns,
  classes,
  classNameOf,
  commentProgress,
  cycleById,
  currentCycle,
  marksDeadlines,
  studentsInClass,
  subjectById,
} from "@/lib/demo-data";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  FileDown,
  Layers,
  Play,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReportCycle, Student } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS = ["Scope", "Validation", "Generate"] as const;

interface ValidationCheck {
  label: string;
  ok: boolean;
  detail: string;
}

function validationFor(classId: string): ValidationCheck[] {
  const deadlines = marksDeadlines.filter((d) => d.classId === classId);
  const incomplete = deadlines.filter((d) => d.entriesDone < d.entriesTotal);
  const first = incomplete[0];
  const comments = commentProgress(classId);
  const approval = approvalFor(classId);
  return [
    {
      label: "Marks complete",
      ok: incomplete.length === 0,
      detail:
        incomplete.length === 0
          ? `${deadlines.length} of ${deadlines.length} subject sheets submitted`
          : `${subjectById(first.subjectId)?.name ?? "Subject"}: ${first.entriesDone} of ${first.entriesTotal} entries${incomplete.length > 1 ? ` (+${incomplete.length - 1} more sheets behind)` : ""}`,
    },
    {
      label: "Class-teacher comments complete",
      ok: comments.done === comments.total,
      detail:
        comments.done === comments.total
          ? `${comments.total} of ${comments.total} written`
          : `${comments.total - comments.done} of ${comments.total} comments missing`,
    },
    {
      label: "Approval status",
      ok: approval.status !== "changes-requested",
      detail:
        approval.status === "changes-requested"
          ? "Changes requested. Resolve in review first"
          : labelForStatus(approval.status),
    },
  ];
}

export default function BatchesPage() {
  const params = useParams<{ cycleId?: string; studentId?: string }>();
  const { toast } = useToast();

  // Param resolution: never crash on unknown ids.
  const cycle: ReportCycle = cycleById(params.cycleId ?? "") ?? currentCycle;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeAttendance, setIncludeAttendance] = useState(true);

  const [runId, setRunId] = useState(`batch-${String(batchRuns.length + 1).padStart(3, "0")}`);
  const [runList, setRunList] = useState<Student[]>([]);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const timersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    for (const t of timersRef.current) clearInterval(t);
    timersRef.current = [];
  };

  // Interval cleanup on unmount and on step change.
  useEffect(() => () => clearTimers(), []);
  useEffect(() => {
    if (step !== 3) return;
    return () => clearTimers();
  }, [step]);

  // Keep the log console pinned to the newest line.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs]);

  const validationRows = useMemo(
    () => selected.map((classId) => ({ classId, checks: validationFor(classId) })),
    [selected],
  );
  const passingIds = validationRows.filter((r) => r.checks.every((c) => c.ok)).map((r) => r.classId);
  const skippedRows = validationRows.filter((r) => !r.checks.every((c) => c.ok));

  const toggleClass = (classId: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, classId] : prev.filter((id) => id !== classId)));
  };

  const startGeneration = () => {
    const list = passingIds.flatMap((classId) => studentsInClass(classId));
    if (list.length === 0) return;
    const id = `batch-${String(batchRuns.length + 1).padStart(3, "0")}`;
    clearTimers();
    setRunId(id);
    setRunList(list);
    setProgress(0);
    setLogs([
      `[info] Batch ${id} started: ${list.length} students across ${passingIds.length} class${passingIds.length === 1 ? "" : "es"}`,
      `[info] Options. Class-teacher comments: ${includeComments ? "on" : "off"} · attendance summary: ${includeAttendance ? "on" : "off"}`,
    ]);
    setDone(false);
    setStep(3);

    let i = 0;
    const progressTimer = setInterval(() => {
      i += 1;
      setProgress(i);
      if (i >= list.length) clearInterval(progressTimer);
    }, 50);

    let j = 0;
    const logTimer = setInterval(() => {
      j += 1;
      const s = list[j - 1];
      if (s) {
        setLogs((prev) => [...prev, `[ok] Report generated: ${s.name} (${classNameOf(s.classId)})`]);
      }
      if (j >= list.length) {
        clearInterval(logTimer);
        setDone(true);
      }
    }, 60);

    timersRef.current = [progressTimer, logTimer];
  };

  const resetWizard = () => {
    clearTimers();
    setStep(1);
    setSelected([]);
    setIncludeComments(true);
    setIncludeAttendance(true);
    setRunList([]);
    setProgress(0);
    setLogs([]);
    setDone(false);
    toast({ title: "Wizard reset", description: "Scope cleared. Choose classes to start another batch." });
  };

  const downloadManifest = () => {
    const rows = [
      ["Student", "Admission No", "Class", "Status"],
      ...runList.map((s) => [s.name, s.admissionNo, classNameOf(s.classId), "Generated"]),
    ];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${runId}-manifest.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Manifest downloaded",
      description: `${runList.length} generated report cards listed in the CSV.`,
    });
  };

  const total = runList.length;
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Batch generation"
        description={`Generate report cards in bulk for ${cycle.name}. Validation failures are skipped, never silently dropped.`}
      />

      {/* Step indicator */}
      <SectionCard>
        <div className="flex items-center">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const completed = n < step;
            const current = n === step;
            return (
              <Fragment key={label}>
                {i > 0 ? (
                  <div className={cn("mx-2 h-px flex-1 sm:mx-3", n <= step ? "bg-success" : "bg-border")} />
                ) : null}
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular",
                      completed && "border-success/40 bg-success/10 text-success-strong",
                      current && "border-primary bg-primary text-primary-foreground",
                      !completed && !current && "border-border bg-background text-muted-foreground",
                    )}
                  >
                    {n}
                  </span>
                  <span
                    className={cn(
                      "hidden text-xs font-medium sm:block",
                      current ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
      </SectionCard>

      {/* Step 1: Scope */}
      {step === 1 ? (
        <SectionCard
          title="Step 1 · Scope"
          description="Choose which classes to include in this batch."
          actions={
            <StatusBadge tone={toneForStatus(cycle.status)} label={`${cycle.term} · ${labelForStatus(cycle.status)}`} />
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border/80 bg-muted/30 px-4 py-3 text-compact">
              <span className="font-medium text-foreground">{cycle.name}</span>
              <span className="text-muted-foreground tabular">
                {cycle.startDate} → {cycle.endDate}
              </span>
              <span className="text-muted-foreground">Marks close: {cycle.closingDate}</span>
              <span className="text-muted-foreground">Release: {cycle.releaseDate}</span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => {
                const checked = selected.includes(cls.id);
                const approval = approvalFor(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={cn(
                      "flex flex-wrap cursor-pointer items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2.5 transition-colors",
                      checked ? "border-primary/40 bg-primary/5" : "border-border/80 hover:bg-muted/30",
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={(v) => toggleClass(cls.id, v === true)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-compact font-medium text-foreground">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {studentsInClass(cls.id).length} students · Room {cls.room}
                      </p>
                    </div>
                    <StatusBadge tone={toneForStatus(approval.status)} label={labelForStatus(approval.status)} />
                  </label>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2.5">
                <div>
                  <p className="text-compact font-medium text-foreground">Include class-teacher comments</p>
                  <p className="text-xs text-muted-foreground">Print the remark block on every card.</p>
                </div>
                <Switch checked={includeComments} onCheckedChange={setIncludeComments} aria-label="Include class-teacher comments" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2.5">
                <div>
                  <p className="text-compact font-medium text-foreground">Include attendance summary</p>
                  <p className="text-xs text-muted-foreground">Add days present / total to each card.</p>
                </div>
                <Switch checked={includeAttendance} onCheckedChange={setIncludeAttendance} aria-label="Include attendance summary" />
              </div>
            </div>

            <div className="flex justify-end border-t border-border/70 pt-3">
              <Button size="sm" className="gap-1.5" disabled={selected.length === 0} onClick={() => setStep(2)}>
                <Layers className="size-4" /> Validate &amp; continue
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* Step 2: Validation */}
      {step === 2 ? (
        <SectionCard
          title="Step 2 · Validation"
          description="Each class is checked for complete marks, complete comments and a reviewable approval status."
        >
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-2">
              {validationRows.map(({ classId, checks }) => {
                const passing = checks.every((c) => c.ok);
                return (
                  <div key={classId} className="rounded-lg border border-border/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-compact font-medium text-foreground">{classNameOf(classId)}</p>
                      <StatusBadge tone={passing ? "success" : "destructive"} label={passing ? "Pass" : "Failing"} />
                    </div>
                    <ul className="mt-3 space-y-1.5">
                      {checks.map((c) => (
                        <li key={c.label} className="flex items-start gap-2 text-compact">
                          {c.ok ? (
                            <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                          ) : (
                            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                          )}
                          <span>
                            <span className="text-foreground">{c.label}</span>{" "}
                            <span className={c.ok ? "text-muted-foreground" : "text-destructive"}>
                             : {c.detail}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                "flex items-start gap-2.5 rounded-lg border px-4 py-3",
                skippedRows.length === 0 ? "border-success/30 bg-success/5" : "border-warning/35 bg-warning/5",
              )}
            >
              {skippedRows.length === 0 ? (
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning-strong" />
              )}
              <p className="text-compact">
                <span className="font-medium text-foreground">
                  {passingIds.length} of {validationRows.length} classes pass validation.
                </span>{" "}
                <span className="text-muted-foreground">
                  Classes that fail validation will be skipped during generation; resolve their issues and run another batch later.
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-border/70 pt-3 sm:flex-row sm:justify-between">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStep(1)}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={passingIds.length === 0}
                onClick={startGeneration}
              >
                <Play className="size-4" /> Generate reports
              </Button>
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* Step 3: Generate */}
      {step === 3 ? (
        <SectionCard
          title="Step 3 · Generate"
          description={
            done
              ? `Batch ${runId} finished.`
              : `Generating ${total} report cards. This is a simulated run.`
          }
          actions={
            done ? (
              <StatusBadge tone="success" label="Completed" />
            ) : (
              <StatusBadge tone="warning" label="Running" />
            )
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-compact">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-foreground tabular">
                  {progress} of {total}
                </span>
              </div>
              <Progress value={percent} className="h-2" />
            </div>

            <div
              ref={logRef}
              className="h-56 overflow-y-auto rounded-lg border border-border/80 bg-muted/30 p-3 font-mono text-xs leading-relaxed text-muted-foreground"
            >
              {logs.map((line, i) => (
                <p key={`${i}-${line.slice(0, 24)}`} className={cn(line.startsWith("[info]") && "text-foreground/70")}>
                  {line}
                </p>
              ))}
              {!done ? <p className="animate-pulse text-foreground/60">_</p> : null}
            </div>

            {done ? (
              <div className="rounded-lg border border-border/80 p-4">
                <p className="text-compact font-medium text-foreground">
                  {runList.length} report cards generated for {passingIds.map(classNameOf).join(", ")}.
                </p>
                {skippedRows.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Skipped classes:</p>
                    {skippedRows.map(({ classId, checks }) => (
                      <p key={classId} className="text-xs text-destructive">
                        {classNameOf(classId)}: {checks.filter((c) => !c.ok).map((c) => c.detail).join("; ")}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">No classes were skipped.</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={downloadManifest}>
                    <FileDown className="size-4" /> Download manifest (CSV)
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={resetWizard}>
                    <RotateCcw className="size-4" /> Start another batch
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {/* Batch history */}
      <SectionCard noPadding title="Batch history" description="Previous generation runs for this school.">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">Batch</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="min-w-60">Scope</TableHead>
                <TableHead className="text-center">Generated</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4">Started by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batchRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="pl-4">
                    <p className="text-compact font-medium text-foreground tabular">{run.id}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-compact tabular text-muted-foreground">
                    {run.createdAt}
                  </TableCell>
                  <TableCell>
                    <p className="text-compact text-foreground">{run.scopeLabel}</p>
                    {run.failed.length > 0 ? (
                      <div className="mt-0.5 space-y-0.5">
                        {run.failed.map((f) => (
                          <p key={f.classId} className="text-xs text-destructive">
                            {classNameOf(f.classId)}: {f.reason}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center text-compact tabular">{run.generated}</TableCell>
                  <TableCell>
                    <StatusBadge tone={toneForStatus(run.status)} label={labelForStatus(run.status)} />
                  </TableCell>
                  <TableCell className="pr-4 text-compact text-muted-foreground">{run.startedBy}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

    </div>
  );
}
