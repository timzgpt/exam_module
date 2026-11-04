"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, toneForStatus, labelForStatus } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  classById,
  classNameOf,
  cycleById,
  currentCycle,
  marksDeadlines,
  subjectById,
} from "@/lib/demo-data";
import { CheckCircle2, CircleX, ClipboardList, PenLine, Percent, Send } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type RowStatus = "complete" | "partial" | "overdue";

const STATUS_TABS = ["all", "overdue", "partial", "complete"] as const;

function statusOf(done: number, total: number): RowStatus {
  if (done >= total) return "complete";
  if (done === 0) return "overdue";
  return "partial";
}

export default function CycleDeadlinesPage() {
  const { toast } = useToast();
  const params = useParams<{ cycleId?: string }>();
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;

  const [tab, setTab] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const rows = marksDeadlines;

  const counts = useMemo(() => {
    const complete = rows.filter((d) => statusOf(d.entriesDone, d.entriesTotal) === "complete").length;
    const overdue = rows.filter((d) => statusOf(d.entriesDone, d.entriesTotal) === "overdue").length;
    const partial = rows.filter((d) => statusOf(d.entriesDone, d.entriesTotal) === "partial").length;
    const entriesTotal = rows.reduce((a, d) => a + d.entriesTotal, 0);
    const entriesDone = rows.reduce((a, d) => a + d.entriesDone, 0);
    return {
      complete,
      overdue,
      partial,
      entriesTotal,
      entriesDone,
      pct: entriesTotal > 0 ? Math.round((entriesDone / entriesTotal) * 100) : 0,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((d) => tab === "all" || statusOf(d.entriesDone, d.entriesTotal) === tab)
      .filter((d) => classFilter === "all" || d.classId === classFilter)
      .sort((a, b) => {
        const sa = statusOf(a.entriesDone, a.entriesTotal);
        const sb = statusOf(b.entriesDone, b.entriesTotal);
        // Incomplete first, most-behind first; completed mark sheets last.
        const rank = (s: RowStatus) => (s === "complete" ? 2 : s === "partial" ? 1 : 0);
        if (rank(sa) !== rank(sb)) return rank(sa) - rank(sb);
        const ra = a.entriesDone / (a.entriesTotal || 1);
        const rb = b.entriesDone / (b.entriesTotal || 1);
        if (ra !== rb) return ra - rb;
        return classNameOf(a.classId).localeCompare(classNameOf(b.classId));
      });
  }, [rows, tab, classFilter]);

  const sendReminder = (deadlineId: string) => {
    const row = rows.find((d) => d.id === deadlineId);
    if (!row) return;
    const subject = subjectById(row.subjectId)?.name ?? "marks";
    const teacher = row.enteredBy ?? "the class teacher";
    toast({
      title: "Reminder sent",
      description: `Reminder sent to ${teacher}: ${subject} · ${classNameOf(row.classId)} (${row.entriesDone}/${row.entriesTotal} entries).`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Marks deadlines"
        description={`${cycle.name}. Subject mark sheets were due ${rows[0]?.dueDate ?? "2026-03-06"}. Incomplete sheets are overdue.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Submissions complete"
          value={`${counts.complete} / ${rows.length}`}
          icon={CheckCircle2}
          tone="success"
          hint="Class · subject mark sheets fully entered"
        />
        <StatCard
          label="Overdue"
          value={counts.overdue}
          icon={CircleX}
          tone="destructive"
          hint="No entries entered. Due date passed"
        />
        <StatCard
          label="Partial"
          value={counts.partial}
          icon={PenLine}
          tone="warning"
          hint="Some entries outstanding"
        />
        <StatCard
          label="Marks entered"
          value={`${counts.pct}%`}
          icon={Percent}
          hint={`${counts.entriesDone} of ${counts.entriesTotal} marks entered`}
        />
      </div>

      <SectionCard
        noPadding
        title="Submission tracker"
        description="One row per class and subject. Send reminders to teachers with outstanding entries."
      >
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="min-h-8 max-w-full flex-wrap">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="h-7 px-2.5 text-xs capitalize">
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="sm:w-52">
            {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="h-8 w-full text-compact">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {[...new Set(rows.map((d) => d.classId))].map((id) => (
                  <SelectItem key={id} value={id}>
                    {classById(id)?.name ?? id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No mark sheets match your filters"
            description="Adjust the status tab or class filter to see more rows."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="min-w-40 pl-4">Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead className="min-w-38">Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => {
                  const subject = subjectById(d.subjectId);
                  const st = statusOf(d.entriesDone, d.entriesTotal);
                  const pct =
                    d.entriesTotal > 0
                      ? Math.round((d.entriesDone / d.entriesTotal) * 100)
                      : 0;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="pl-4">
                        <p className="text-compact font-medium text-foreground">
                          {subject?.name ?? "Subject"}
                        </p>
                        <p className="text-xs text-muted-foreground tabular">{subject?.code}</p>
                      </TableCell>
                      <TableCell className="text-compact">{classNameOf(d.classId)}</TableCell>
                      <TableCell className="text-compact text-muted-foreground">
                        {d.enteredBy ?? "-"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-compact tabular text-muted-foreground">
                        {d.dueDate}
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between text-xs text-muted-foreground tabular">
                            <span>
                              {d.entriesDone}/{d.entriesTotal}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <Progress value={pct} className="mt-1 h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={toneForStatus(st)} label={labelForStatus(st)} />
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs"
                          disabled={st === "complete"}
                          onClick={() => sendReminder(d.id)}
                        >
                          <Send className="size-3.5" /> Send reminder
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
