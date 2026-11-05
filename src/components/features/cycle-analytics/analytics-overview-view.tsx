"use client";

import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { GradePill } from "@/components/shared/grade-pill";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCycleContext } from "@/hooks/use-academic-context";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileCheck2,
  MessageSquareText,
  TrendingUp,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { cycleStatsFor, defaultScheme, marksDeadlines } from "@/lib/demo-data";
import { deltaLabel, formatAvg, gradeFor } from "@/lib/grading";
import { PREV_TERM_BASELINE_AVERAGE } from "@/lib/demo-config";

const averageChartConfig = {
  avg: { label: "Average", color: "var(--primary)" },
} satisfies ChartConfig;

const gradeChartConfig = {
  count: { label: "Marks", color: "var(--primary)" },
} satisfies ChartConfig;

const donutChartConfig = {
  complete: { label: "Marks entered", color: "var(--success)" },
  outstanding: { label: "Outstanding", color: "var(--warning)" },
} satisfies ChartConfig;

type CompletionTone = "success" | "warning" | "destructive";

function completionTone(value: number): CompletionTone {
  if (value >= 90) return "success";
  if (value >= 60) return "warning";
  return "destructive";
}

/** Executive overview view of the Cycle analytics host. */
export function AnalyticsOverviewView() {
  const router = useRouter();
  const { cycle } = useCycleContext();

  const stats = cycleStatsFor(cycle.id);

  const gradeData = Object.entries(stats.gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
  }));
  const classData = stats.classAverages.map((c) => ({ name: c.name, avg: c.avg }));
  const subjectData = [...stats.subjectAverages].sort((a, b) => b.avg - a.avg);

  const totalEntries = marksDeadlines.reduce((a, d) => a + d.entriesTotal, 0);
  const doneEntries = marksDeadlines.reduce((a, d) => a + d.entriesDone, 0);
  const outstandingEntries = totalEntries - doneEntries;
  const donutData = [
    { name: "complete", value: doneEntries, fill: "var(--success)" },
    { name: "outstanding", value: outstandingEntries, fill: "var(--warning)" },
  ];
  const enteredPct = totalEntries ? Math.round((doneEntries / totalEntries) * 100) : 0;

  const attentionRows = [...stats.classAverages]
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 4)
    .map((c) => ({
      ...c,
      incomplete: marksDeadlines.filter(
        (d) => d.classId === c.classId && d.entriesDone < d.entriesTotal,
      ).length,
    }));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cycle average"
          value={formatAvg(stats.average)}
          icon={TrendingUp}
          delta={deltaLabel(stats.average, PREV_TERM_BASELINE_AVERAGE)}
          hint="vs Term 3 2025"
        />
        <StatCard
          label="Pass rate"
          value={`${stats.passRate}%`}
          icon={CheckCircle2}
          tone="success"
          hint={`${stats.totalStudents} students assessed`}
        />
        <StatCard
          label="Marks completion"
          value={`${stats.marksCompletion}%`}
          icon={FileCheck2}
          tone={completionTone(stats.marksCompletion)}
          hint="Marks entry across all classes"
        />
        <StatCard
          label="Comments completion"
          value={`${stats.commentsCompletion}%`}
          icon={MessageSquareText}
          tone={completionTone(stats.commentsCompletion)}
          hint="Class-teacher comments written"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <SectionCard title="Grade distribution" description="Every submitted mark graded A-F across the cycle.">
          <ChartContainer config={gradeChartConfig} className="h-[220px] w-full">
            <BarChart data={gradeData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="grade" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" className="fill-primary" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Class averages" description="Mean score per class, Form 1 through Form 4.">
          <ChartContainer config={averageChartConfig} className="h-[220px] w-full">
            <BarChart data={classData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} width={28} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="avg" className="fill-primary" radius={[4, 4, 0, 0]} barSize={26} />
            </BarChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Subject averages" description="All subjects ranked by mean score.">
          <ChartContainer config={averageChartConfig} className="h-[260px] w-full">
            <BarChart data={subjectData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="avg" className="fill-primary" radius={[0, 4, 4, 0]} barSize={13} />
            </BarChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Submissions" description="Marks entered vs still outstanding across all class-subject deadlines.">
          <div className="relative">
            <ChartContainer config={donutChartConfig} className="mx-auto h-[210px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={2}
                  strokeWidth={2}
                >
                  {donutData.map((d) => (
                    <Cell key={d.name} fill={d.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular text-foreground">{enteredPct}%</span>
              <span className="text-2xs text-muted-foreground">entered</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-success" />
              {doneEntries} entered
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-xs bg-warning" />
              {outstandingEntries} outstanding
            </span>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard
          title="Top performers"
          description="Five highest student averages this cycle."
          noPadding
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10 pl-4">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="pr-4 text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topStudents.map((s, i) => (
                  <TableRow key={`${s.name}-${i}`}>
                    <TableCell className="pl-4 text-compact tabular text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="text-compact font-medium text-foreground">{s.name}</TableCell>
                    <TableCell className="text-compact text-muted-foreground">{s.className}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-compact tabular">{formatAvg(s.avg)}</span>
                        <GradePill grade={gradeFor(s.avg, defaultScheme)?.grade ?? "-"} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SectionCard>

        <SectionCard
          title="Needs attention"
          description="Lowest class averages and outstanding marks submissions. Open a row to visit the deadline tracker."
        >
          <div className="space-y-2">
            {attentionRows.map((row) => (
              <button
                key={row.classId}
                type="button"
                onClick={() => router.push(`/academic/report-cycles/${cycle.id}/deadlines`)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="text-compact font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Mean {formatAvg(row.avg)} · {row.incomplete} incomplete submission
                    {row.incomplete === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {row.incomplete > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive-strong">
                      <AlertTriangle className="size-3" />
                      {row.incomplete}
                    </span>
                  ) : (
                    <CheckCircle2 className="size-4 text-success" />
                  )}
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
