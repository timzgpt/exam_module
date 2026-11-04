"use client";

import { GradePill } from "@/components/shared/grade-pill";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
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
  subjects,
} from "@/lib/demo-data";
import { averageOf, formatAvg, gradeFor, gradeToneClass, passRateOf } from "@/lib/grading";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowDownRight, Award, CheckCircle2, Download, Percent } from "lucide-react";
import { useMemo } from "react";

const BRAND_COLOR = "var(--primary)";

/** Results analysis view of the Results & targets host. */
export function ResultsAnalysisView() {
  const { toast } = useToast();
  const { klass: cls } = useClassContext();
  const { cycle } = useCycleContext();

  const results = useMemo(() => classResults(cls.id), [cls.id]);
  const subjectStats = useMemo(() => subjectAveragesFor(cls.id), [cls.id]);

  const allMarks = useMemo(
    () =>
      results.flatMap((r) =>
        Object.values(r.marks).filter((v): v is number => v !== null),
      ),
    [results],
  );
  const classAverage = averageOf(allMarks);
  const passRate = passRateOf(allMarks, defaultScheme.passMark);
  const topStudent = results[0];
  const lowestSubjectStat = useMemo(
    () => [...subjectStats].filter((s) => s.avg > 0).sort((a, b) => a.avg - b.avg)[0],
    [subjectStats],
  );
  const lowestSubject = lowestSubjectStat ? subjectById(lowestSubjectStat.subjectId) : undefined;

  const distribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const b of defaultScheme.boundaries) dist[b.grade] = 0;
    for (const m of allMarks) {
      const g = gradeFor(m, defaultScheme);
      if (g) dist[g.grade] += 1;
    }
    return defaultScheme.boundaries.map((b) => ({ grade: b.grade, students: dist[b.grade] ?? 0 }));
  }, [allMarks]);

  const subjectChartData = useMemo(
    () =>
      subjectStats.map((st) => ({
        name: subjectById(st.subjectId)?.name ?? st.subjectId,
        avg: Number(st.avg.toFixed(1)),
      })),
    [subjectStats],
  );

  const distConfig = { students: { label: "Students", color: BRAND_COLOR } } satisfies ChartConfig;
  const avgConfig = { avg: { label: "Average", color: BRAND_COLOR } } satisfies ChartConfig;

  const exportCsv = () => {
    const header = ["Pos", "Student", "Adm. no", ...subjects.map((s) => s.code), "Total", "Average", "Grade"];
    const rows = results.map((r) => [
      String(r.rank),
      r.student.name,
      r.student.admissionNo,
      ...subjects.map((s) => {
        const m = r.marks[s.id];
        return m === null || m === undefined ? "" : String(m);
      }),
      r.count > 0 ? String(r.total) : "",
      r.count > 0 ? formatAvg(r.average) : "",
      r.grade,
    ]);
    downloadCsv(
      [header, ...rows],
      `results-${cls.name.toLowerCase().replace(/\s+/g, "-")}-${cycle.term.toLowerCase().replace(/\s+/g, "")}.csv`,
    );
    toast({ title: "Results exported", description: `The ${cls.name} results table was downloaded as CSV.` });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Class average"
          value={formatAvg(classAverage)}
          icon={Percent}
          tone="primary"
          hint={`${allMarks.length} entered marks`}
        />
        <StatCard
          label="Pass rate"
          value={`${passRate}%`}
          icon={CheckCircle2}
          tone="success"
          hint={`Pass mark ${defaultScheme.passMark} · ${defaultScheme.name}`}
        />
        <StatCard
          label="Highest average"
          value={topStudent ? formatAvg(topStudent.average) : "-"}
          icon={Award}
          hint={topStudent ? `${topStudent.student.name} · Pos ${topStudent.rank}` : "No results"}
        />
        <StatCard
          label="Lowest subject"
          value={lowestSubjectStat ? formatAvg(lowestSubjectStat.avg) : "-"}
          icon={ArrowDownRight}
          tone="warning"
          hint={lowestSubject ? `${lowestSubject.name} class mean` : "No results"}
        />
      </div>

      <SectionCard
        noPadding
        title="Order of merit"
        description="Students ranked by average across all subjects with entered marks."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      >
        <div className="[&_[data-slot=table-container]]:max-h-[62vh]">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">Pos</TableHead>
                <TableHead className="sticky left-0 z-30 min-w-48 border-r border-border/60 bg-muted/40 pl-3">
                  Student
                </TableHead>
                <TableHead>Adm. no</TableHead>
                {subjects.map((s) => (
                  <TableHead key={s.id} className="text-center" title={s.name}>
                    {s.code}
                  </TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Avg</TableHead>
                <TableHead className="text-center pr-4">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.student.id}>
                  <TableCell className="text-center text-compact tabular font-medium text-muted-foreground">
                    {r.rank}
                  </TableCell>
                  <TableCell className="sticky left-0 border-r border-border/40 bg-card pl-3">
                    <p className="whitespace-nowrap text-compact font-medium text-foreground">{r.student.name}</p>
                  </TableCell>
                  <TableCell className="text-xs tabular text-muted-foreground">{r.student.admissionNo}</TableCell>
                  {subjects.map((s) => {
                    const m = r.marks[s.id];
                    const g = m !== null && m !== undefined ? gradeFor(m, defaultScheme) : undefined;
                    return (
                      <TableCell key={s.id} className="text-center text-compact tabular">
                        {m === null || m === undefined ? (
                          <span className="text-muted-foreground">-</span>
                        ) : (
                          <span className={cn("rounded px-1.5 py-0.5 font-medium", gradeToneClass(g?.grade ?? "F"))}>
                            {m}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center text-compact tabular">
                    {r.count > 0 ? r.total : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-center text-compact tabular font-medium">
                    {r.count > 0 ? formatAvg(r.average) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="pr-4 text-center">
                    {r.count > 0 ? <GradePill grade={r.grade} /> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Grade legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Grade legend</span>
          {defaultScheme.boundaries.map((b) => (
            <span key={b.grade} className="inline-flex items-center gap-1.5">
              <span className={cn("size-2.5 rounded-full border", gradeToneClass(b.grade))} />
              <span className="tabular">
                {b.grade} · {b.min}-{b.max}
              </span>
            </span>
          ))}
        </div>
      </SectionCard>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Grade distribution" description="All entered marks for the class, grouped by grade band.">
          <ChartContainer config={distConfig} className="h-[300px] w-full">
            <BarChart data={distribution} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="grade" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="students" fill="var(--color-students)" radius={4} maxBarSize={48} />
            </BarChart>
          </ChartContainer>
        </SectionCard>

        <SectionCard title="Subject averages" description="Class mean per subject against the 0-100 scale.">
          <ChartContainer config={avgConfig} className="h-[380px] w-full">
            <BarChart
              data={subjectChartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 12, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                type="category"
                dataKey="name"
                width={116}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="avg" fill="var(--color-avg)" radius={4} barSize={14} />
            </BarChart>
          </ChartContainer>
        </SectionCard>
      </div>

      {/* Entry coverage note */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">
          {subjects.length} subjects
        </Badge>
        <Badge variant="outline" className="font-normal">
          {results.length} students
        </Badge>
        <Badge variant="outline" className="font-normal tabular">
          {allMarks.length} marks recorded
        </Badge>
        <span>
          Averages only count subjects with entered marks; dashes mean the mark has not been submitted.
        </span>
      </div>
    </div>
  );
}
