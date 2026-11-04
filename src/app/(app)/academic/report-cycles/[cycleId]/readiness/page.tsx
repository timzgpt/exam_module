"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, toneForStatus, labelForStatus } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/lib/demo-config";
import {
  approvalFor,
  classes,
  classNameOf,
  commentProgress,
  cycleById,
  cycleStatsFor,
  currentCycle,
  marksDeadlines,
  subjectById,
} from "@/lib/demo-data";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Info,
  MessageSquareText,
  RefreshCw,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export default function CycleReadinessPage() {
  const { toast } = useToast();
  const params = useParams<{ cycleId?: string }>();
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;
  const stats = cycleStatsFor(cycle.id);

  /* Overall readiness: average of marks and comments completion. */
  const readiness = Math.round((stats.marksCompletion + stats.commentsCompletion) / 2);

  const perClass = classes.map((cls) => {
    const rows = marksDeadlines.filter((d) => d.classId === cls.id);
    const done = rows.reduce((a, d) => a + d.entriesDone, 0);
    const total = rows.reduce((a, d) => a + d.entriesTotal, 0);
    const marksPct = total > 0 ? Math.round((done / total) * 100) : 0;
    const cp = commentProgress(cls.id);
    const commentsPct = cp.total > 0 ? Math.round((cp.done / cp.total) * 100) : 0;
    const approval = approvalFor(cls.id);
    const eligible =
      marksPct === 100 && (approval.status === "approved" || approval.status === "submitted");
    return { cls, marksPct, done, total, commentsPct, cp, approval, eligible };
  });

  /* Blocking issues — incomplete marks, and pending approvals on classes with incomplete marks. */
  const marksIssues = marksDeadlines
    .filter((d) => d.entriesDone < d.entriesTotal)
    .sort((a, b) => a.entriesDone / a.entriesTotal - b.entriesDone / b.entriesTotal);
  const approvalIssues = perClass
    .filter(
      (c) =>
        c.marksPct < 100 &&
        (c.approval.status === "changes-requested" || c.approval.status === "not-submitted"),
    )
    .map((c) => ({ cls: c.cls, approval: c.approval, marksPct: c.marksPct }));
  const blockingCount = marksIssues.length + approvalIssues.length;

  /* Warnings — classes with missing class-teacher comments. */
  const commentWarnings = perClass.filter((c) => c.cp.done < c.cp.total);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Readiness check"
        description={`${cycle.name} — can report cards be generated? Review marks entry, comments and approvals before batching.`}
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link href={routes.reportCycles}>
                <ArrowLeft className="size-4" /> All cycles
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() =>
                toast({
                  title: "Readiness recalculated",
                  description: "Figures reflect the current marks, comments and approvals in this demo.",
                })
              }
            >
              <RefreshCw className="size-4" /> Recalculate
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Overall readiness gauge */}
        <SectionCard
          title="Overall readiness"
          description={`${cycle.term} ${cycle.academicYear} · marks and comments combined`}
        >
          <div className="space-y-4">
            <div className="relative mx-auto h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Complete", value: readiness },
                      { name: "Remaining", value: 100 - readiness },
                    ]}
                    dataKey="value"
                    innerRadius={56}
                    outerRadius={76}
                    startAngle={90}
                    endAngle={-270}
                    strokeWidth={0}
                  >
                    <Cell fill="#16834a" />
                    <Cell fill="var(--muted)" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular text-foreground">{readiness}%</span>
                <span className="text-xs text-muted-foreground">ready</span>
              </div>
            </div>
            <p
              className={
                blockingCount === 0
                  ? "flex items-center gap-1.5 text-sm font-medium text-[#16834a]"
                  : "flex items-center gap-1.5 text-sm font-medium text-[#b91c1c]"
              }
            >
              {blockingCount === 0 ? (
                <BadgeCheck className="size-4" />
              ) : (
                <AlertTriangle className="size-4" />
              )}
              {blockingCount === 0
                ? "Ready — no blocking issues"
                : `Not ready — ${blockingCount} blocking issue${blockingCount === 1 ? "" : "s"}`}
            </p>
            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Marks entry</span>
                  <span className="tabular">{stats.marksCompletion}%</span>
                </div>
                <Progress value={stats.marksCompletion} className="mt-1 h-1.5" />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Teacher comments</span>
                  <span className="tabular">{stats.commentsCompletion}%</span>
                </div>
                <Progress value={stats.commentsCompletion} className="mt-1 h-1.5" />
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Blocking issues */}
        <SectionCard
          className="lg:col-span-2"
          title="Blocking issues"
          description="These must be resolved before report cards can be generated."
          actions={
            <StatusBadge
              tone={blockingCount === 0 ? "success" : "destructive"}
              label={blockingCount === 0 ? "Clear" : `${blockingCount} blocking`}
            />
          }
        >
          {blockingCount === 0 ? (
            <EmptyState
              icon={BadgeCheck}
              title="No blocking issues"
              description="Marks are complete and every class is approved or submitted."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {marksIssues.map((d) => {
                const subject = subjectById(d.subjectId);
                const missing = d.entriesTotal - d.entriesDone;
                return (
                  <li key={d.id} className="flex items-start gap-2.5 px-1 py-2.5 first:pt-0 last:pb-0">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">
                        {subject?.name ?? "Subject"} · {classNameOf(d.classId)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular">
                        {d.entriesDone} of {d.entriesTotal} entries entered · {missing} missing
                        (overdue — due {d.dueDate})
                      </p>
                    </div>
                  </li>
                );
              })}
              {approvalIssues.map(({ cls, approval, marksPct }) => (
                <li
                  key={`approval-${cls.id}`}
                  className="flex items-start gap-2.5 px-1 py-2.5 first:pt-0 last:pb-0"
                >
                  <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {cls.name} · approval {labelForStatus(approval.status).toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {approval.status === "changes-requested"
                        ? `${approval.reviewedBy ?? "Reviewer"} requested changes${approval.note ? ` — ${approval.note}` : ""}`
                        : `Class has not submitted for review and marks are only ${marksPct}% entered.`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Warnings */}
        <SectionCard
          title="Warnings"
          description="Non-blocking, but worth chasing before release."
          actions={
            <StatusBadge
              tone={commentWarnings.length === 0 ? "success" : "warning"}
              label={commentWarnings.length === 0 ? "None" : `${commentWarnings.length} classes`}
            />
          }
        >
          {commentWarnings.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="All comments complete"
              description="Every class-teacher comment has been written."
            />
          ) : (
            <ul className="space-y-2.5">
              {commentWarnings.map((c) => (
                <li key={c.cls.id} className="flex items-start gap-2.5">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#c47a16]" />
                  <p className="text-[13px] text-foreground tabular">
                    {c.cls.name} — {c.cp.done} of {c.cp.total} class-teacher comments complete
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Per-class readiness */}
        <SectionCard
          noPadding
          className="lg:col-span-2"
          title="Per-class readiness"
          description="A class is eligible for batch generation when marks are 100% entered and approval is submitted or approved."
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Class</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead className="pr-4">Eligible?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perClass.map((c) => (
                  <TableRow key={c.cls.id}>
                    <TableCell className="pl-4">
                      <p className="text-[13.5px] font-medium text-foreground">{c.cls.name}</p>
                      <p className="text-xs text-muted-foreground">{c.cls.level}</p>
                    </TableCell>
                    <TableCell>
                      <div className="w-28">
                        <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
                          <span>
                            {c.done}/{c.total}
                          </span>
                          <span>{c.marksPct}%</span>
                        </div>
                        <Progress value={c.marksPct} className="mt-1 h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-28">
                        <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
                          <span>
                            {c.cp.done}/{c.cp.total}
                          </span>
                          <span>{c.commentsPct}%</span>
                        </div>
                        <Progress value={c.commentsPct} className="mt-1 h-1.5" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={toneForStatus(c.approval.status)}
                        label={labelForStatus(c.approval.status)}
                      />
                    </TableCell>
                    <TableCell className="pr-4">
                      <span
                        className={
                          c.eligible
                            ? "inline-flex items-center gap-1.5 text-[13px] font-medium text-[#16834a]"
                            : "inline-flex items-center gap-1.5 text-[13px] font-medium text-destructive"
                        }
                      >
                        {c.eligible ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        {c.eligible ? "Eligible" : "Not eligible"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="flex items-center gap-1.5 border-t border-border/70 px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="size-3.5 shrink-0" />
            Classes marked eligible can be included in batch generation.
          </p>
        </SectionCard>
      </div>
    </div>
  );
}
