"use client";

import { GradePill } from "@/components/shared/grade-pill";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useClassContext, useCycleContext } from "@/hooks/use-academic-context";
import {
  classResults,
  defaultScheme,
  subjectAveragesFor,
  subjectById,
  targetFor,
} from "@/lib/demo-data";
import { averageOf, formatAvg } from "@/lib/grading";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Save, Target, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

interface TargetRow {
  studentId: string;
  name: string;
  current: number;
  grade: string;
  target: number;
  focus: string;
}

const clampTarget = (n: number) => Math.min(99, Math.max(35, Math.round(n)));

/** Next-term targets view of the Results & targets host. */
export function TargetsView() {
  const { toast } = useToast();
  const { klass: cls } = useClassContext();
  const { cycle } = useCycleContext();

  const [rows, setRows] = useState<TargetRow[]>(() =>
    classResults(cls.id).map((r) => {
      const t = targetFor(r.student.id);
      return {
        studentId: r.student.id,
        name: r.student.name,
        current: r.average,
        grade: r.grade,
        target: t.targetAverage,
        focus: t.focus,
      };
    }),
  );

  const update = (studentId: string, patch: Partial<TargetRow>) =>
    setRows((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, ...patch } : r)));

  const currentAvg = averageOf(rows.map((r) => r.current));
  const meanTarget = averageOf(rows.map((r) => r.target));
  const onTrack = rows.filter((r) => r.current >= r.target - 8);
  const onTrackPct = rows.length ? Math.round((onTrack.length / rows.length) * 100) : 0;

  const lowestSubjectStat = useMemo(
    () =>
      subjectAveragesFor(cls.id)
        .filter((s) => s.avg > 0)
        .sort((a, b) => a.avg - b.avg)[0],
    [cls.id],
  );
  const lowestSubject = lowestSubjectStat ? subjectById(lowestSubjectStat.subjectId) : undefined;
  const focusCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.focus, (counts.get(r.focus) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [rows]);

  const recommendations = useMemo(() => {
    const list: { icon: typeof Target; text: string }[] = [];
    if (lowestSubject && lowestSubjectStat) {
      list.push({
        icon: Lightbulb,
        text: `Prioritise ${lowestSubject.name} remedials. Class mean ${formatAvg(lowestSubjectStat.avg)} is the weakest subject against a ${defaultScheme.passMark} pass mark.`,
      });
    }
    const needsPush = rows.length - onTrack.length;
    list.push({
      icon: Target,
      text:
        needsPush === 0
          ? `Every student is within 8 points of their target. Maintain momentum with enrichment tasks.`
          : `${needsPush} of ${rows.length} students sit more than 8 points below their target. Schedule one-on-one target reviews this week.`,
    });
    if (focusCount) {
      list.push({
        icon: TrendingUp,
        text: `Closing the ${formatAvg(Math.abs(meanTarget - currentAvg))}-point gap to the mean target starts with "${focusCount[0]}". Flagged by ${focusCount[1]} student${focusCount[1] === 1 ? "" : "s"}.`,
      });
    }
    return list;
  }, [lowestSubject, lowestSubjectStat, rows, onTrack.length, focusCount, meanTarget, currentAvg]);

  const save = () => {
    toast({
      title: "Targets saved",
      description: `${rows.length} next-term targets saved for ${cls.name}.`,
    });
  };

  return (
    <div className="space-y-5">
      <SectionCard
        title="Class summary"
        description={`Where the class stands against its collective ambition for ${cycle.name}.`}
        actions={
          <Button size="sm" className="gap-1.5" onClick={save}>
            <Save className="size-4" /> Save targets
          </Button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-compact font-medium text-muted-foreground">Current class average</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl font-semibold tabular tracking-tight text-foreground">
                {formatAvg(currentAvg)}
              </span>
              <GradePill grade={defaultScheme.boundaries.find((b) => currentAvg >= b.min && currentAvg <= b.max)?.grade ?? "F"} />
            </div>
          </div>
          <div>
            <p className="text-compact font-medium text-muted-foreground">Mean target</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular tracking-tight text-primary">
                {formatAvg(meanTarget)}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  meanTarget >= currentAvg ? "text-success" : "text-destructive",
                )}
              >
                {meanTarget >= currentAvg ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {formatAvg(Math.abs(meanTarget - currentAvg))} pts
              </span>
            </div>
          </div>
          <div>
            <p className="text-compact font-medium text-muted-foreground">On track</p>
            <p className="mt-1.5 text-2xl font-semibold tabular tracking-tight text-foreground">
              {onTrack.length}
              <span className="text-base font-normal text-muted-foreground"> of {rows.length}</span>
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Students on track (within 8 points of target)</span>
            <span className="tabular">{onTrackPct}%</span>
          </div>
          <Progress value={onTrackPct} />
        </div>
      </SectionCard>

      <SectionCard
        noPadding
        title="Student targets"
        description="Target averages between 35 and 99; gap shows target minus current average."
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="sticky left-0 z-10 min-w-48 border-r border-border/60 bg-muted/40 pl-4">
                  Student
                </TableHead>
                <TableHead className="text-center">Current avg</TableHead>
                <TableHead className="w-24 text-center">Target</TableHead>
                <TableHead className="text-center">Gap</TableHead>
                <TableHead className="min-w-45">Focus area</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-32 pr-4">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const gap = r.target - r.current;
                const onTrackRow = r.current >= r.target - 8;
                const pct = r.target > 0 ? Math.min(100, Math.round((r.current / r.target) * 100)) : 0;
                return (
                  <TableRow key={r.studentId}>
                    <TableCell className="sticky left-0 z-10 border-r border-border/40 bg-card pl-4">
                      <p className="whitespace-nowrap text-compact font-medium text-foreground">{r.name}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 text-compact tabular">
                        {formatAvg(r.current)}
                        <GradePill grade={r.grade} />
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Input
                        type="number"
                        min={35}
                        max={99}
                        value={String(r.target)}
                        onChange={(e) => {
                          const n = Number.parseInt(e.target.value, 10);
                          if (!Number.isNaN(n)) update(r.studentId, { target: clampTarget(n) });
                        }}
                        className="mx-auto h-8 w-16 text-center text-compact tabular"
                        aria-label={`Target average for ${r.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-compact font-medium tabular",
                          gap >= 0 ? "text-success" : "text-destructive",
                        )}
                      >
                        {gap >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
                        {gap >= 0 ? "+" : "−"}
                        {formatAvg(Math.abs(gap))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={r.focus}
                        onChange={(e) => update(r.studentId, { focus: e.target.value })}
                        className="h-8 min-w-40 text-compact"
                        aria-label={`Focus area for ${r.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge tone={onTrackRow ? "success" : "warning"} label={onTrackRow ? "On track" : "Needs push"} />
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="w-9 text-right text-xs tabular text-muted-foreground">{pct}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Recommendations"
        description="Generated from this class's results and targets."
      >
        <ul className="divide-y divide-border/60">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/8 text-primary">
                <rec.icon className="size-4" />
              </span>
              <p className="text-compact leading-relaxed text-foreground">{rec.text}</p>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
