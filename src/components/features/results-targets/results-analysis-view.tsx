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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useClassContext, useCycleContext } from "@/hooks/use-academic-context";
import {
  classResults,
  getComponents,
  isPrimaryClass,
  schemeForClass,
  subjectAveragesFor,
  subjectById,
} from "@/lib/demo-data";
import {
  averageOf,
  componentAverage,
  fmtTotalMark,
  formatAvg,
  gradeFor,
  gradeToneClass,
  overallClassScore,
  passRateOf,
} from "@/lib/grading";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ArrowDownRight, Award, CheckCircle2, Download, Percent } from "lucide-react";
import { useMemo } from "react";
import { useEffectiveClassSubjects } from "@/lib/academic-store";

const BRAND_COLOR = "var(--primary)";

/** Results analysis view of the Results & targets host. */
export function ResultsAnalysisView() {
  const { toast } = useToast();
  const { klass: cls } = useClassContext();
  const { cycle } = useCycleContext();

  const results = useMemo(() => classResults(cls.id), [cls.id]);
  const subjectStats = useMemo(() => subjectAveragesFor(cls.id), [cls.id]);
  const classSubjects = useEffectiveClassSubjects(cls.id);
  const scheme = schemeForClass(cls.id);
  const isPrimary = isPrimaryClass(cls.id);

  const allMarks = useMemo(
    () =>
      results.flatMap((r) =>
        Object.values(r.marks).filter((v): v is number => v !== null),
      ),
    [results],
  );
  const classAverage = averageOf(allMarks);
  const passRate = passRateOf(allMarks, scheme.passMark);
  const topStudent = results[0];
  const lowestSubjectStat = useMemo(
    () => [...subjectStats].filter((s) => s.avg > 0).sort((a, b) => a.avg - b.avg)[0],
    [subjectStats],
  );
  const lowestSubject = lowestSubjectStat ? subjectById(lowestSubjectStat.subjectId) : undefined;

  const distribution = useMemo(() => {
    const dist: Record<string, number> = {};
    for (const b of scheme.boundaries) dist[b.grade] = 0;
    for (const m of allMarks) {
      const g = gradeFor(m, scheme);
      if (g) dist[g.grade] += 1;
    }
    return scheme.boundaries.map((b) => ({ grade: b.grade, students: dist[b.grade] ?? 0 }));
  }, [allMarks, scheme]);

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

  /**
   * Footer statistics per class subject. Component averages count entered
   * marks only (blanks doubly excluded); the class total is
   * avg(CA) × w1 + avg(Exam) × w2 with the 100% rule when one component has
   * no entries at all.
   */
  const footerStats = useMemo(
    () =>
      classSubjects.map((cs) => {
        const comps = getComponents(cls.id, cs.subjectId);
        const enrolledComps = Object.values(comps).filter((c) => c.enrolled);
        const caVals = enrolledComps.map((c) => c.ca);
        const examVals = enrolledComps.map((c) => c.exam);
        return {
          cs,
          caAvg: componentAverage(caVals),
          examAvg: componentAverage(examVals),
          classTotal: overallClassScore(caVals, examVals, cs.caMarks, cs.examMarks),
        };
      }),
    [cls.id, classSubjects],
  );

  const exportCsv = () => {
    const header = [
      "Pos",
      "Student",
      "Adm. no",
      ...classSubjects.map((cs) => cs.chartLabel),
      "Total",
      "Average",
      "Grade",
      "Division",
    ];
    const studentRows = results.map((r) => [
      String(r.rank),
      r.student.name,
      r.student.admissionNo,
      ...classSubjects.map((cs) => {
        const m = r.marks[cs.subjectId];
        return m === null || m === undefined ? "" : String(m);
      }),
      r.count > 0 ? String(r.total) : "",
      r.count > 0 ? formatAvg(r.average) : "",
      r.grade,
      r.division ? `Div ${r.division.division} (${r.division.pointsSum} pts)` : "",
    ]);
    const summaryRows = [
      [
        "",
        "CA average (entered only)",
        "",
        ...footerStats.map((f) => (f.caAvg !== null ? fmtTotalMark(f.caAvg) : "")),
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "Exam average (entered only)",
        "",
        ...footerStats.map((f) => (f.examAvg !== null ? fmtTotalMark(f.examAvg) : "")),
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "Class total (avg CA x w1 + avg Exam x w2)",
        "",
        ...footerStats.map((f) => (f.classTotal !== null ? fmtTotalMark(f.classTotal) : "")),
        "",
        "",
        "",
        "",
      ],
    ];
    downloadCsv(
      [header, ...studentRows, ...summaryRows],
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
          hint={`Pass mark ${scheme.passMark} · ${scheme.name}`}
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
                {classSubjects.map((cs) => {
                  const subject = subjectById(cs.subjectId);
                  return (
                    <TableHead
                      key={cs.subjectId}
                      className="text-center"
                      title={`${subject?.name ?? cs.subjectId} · ${cs.type === "core" ? "Core (compulsory)" : "Subsidiary (enrolled students only)"} · CA ${cs.caMarks} + Exam ${cs.examMarks}`}
                    >
                      {cs.chartLabel}
                      {cs.type === "subsidiary" ? (
                        <span className="ml-0.5 text-3xs text-muted-foreground">*</span>
                      ) : null}
                    </TableHead>
                  );
                })}
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Avg</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-center pr-4">Division</TableHead>
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
                  {classSubjects.map((cs) => {
                    const m = r.marks[cs.subjectId];
                    const g = m !== null && m !== undefined ? gradeFor(m, scheme) : undefined;
                    return (
                      <TableCell key={cs.subjectId} className="text-center text-compact tabular">
                        {m === null || m === undefined ? (
                          <span className="text-muted-foreground" title="No mark entered">
                            —
                          </span>
                        ) : (
                          <span className={cn("rounded px-1.5 py-0.5 font-medium", gradeToneClass(g?.grade ?? "F"))}>
                            {fmtTotalMark(m)}
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
                  <TableCell className="text-center">
                    {r.count > 0 ? <GradePill grade={r.grade} /> : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="pr-4 text-center text-compact tabular">
                    {r.division ? (
                      <span title={`Best-7 points: ${r.division.pointsSum} · ${r.division.label}`}>
                        Div {r.division.division}
                      </span>
                    ) : (
                      <span
                        title={
                          isPrimary
                            ? "Divisions apply to secondary (NECTA CSEE) classes only"
                            : "Fewer than 7 graded subjects — no division printed"
                        }
                      >
                        —
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell
                  colSpan={3}
                  className="sticky left-0 z-20 border-r border-border/40 bg-muted/95 pl-3 text-2xs uppercase tracking-wide text-muted-foreground"
                >
                  Component averages · entered marks only
                </TableCell>
                {footerStats.map(({ cs, caAvg, examAvg }) => (
                  <TableCell key={cs.subjectId} className="text-center text-2xs leading-tight tabular text-muted-foreground">
                    {caAvg !== null ? fmtTotalMark(caAvg) : "—"}
                    <span className="mx-0.5 text-border">/</span>
                    {examAvg !== null ? fmtTotalMark(examAvg) : "—"}
                  </TableCell>
                ))}
                <TableCell colSpan={4} />
              </TableRow>
              <TableRow className="border-t-2 border-border/70 bg-muted/60 hover:bg-muted/60">
                <TableCell
                  colSpan={3}
                  className="sticky left-0 z-20 border-r border-border/40 bg-muted/95 pl-3 text-xs font-medium text-foreground"
                  title="avg(CA) × w1 + avg(Exam) × w2 — with the 100% rule when one component has no entries"
                >
                  Class total
                </TableCell>
                {footerStats.map(({ cs, classTotal }) => (
                  <TableCell key={cs.subjectId} className="text-center text-compact font-semibold tabular text-foreground">
                    {classTotal !== null ? fmtTotalMark(classTotal) : <span className="font-normal text-muted-foreground">—</span>}
                  </TableCell>
                ))}
                <TableCell colSpan={4} className="pr-4 text-2xs text-muted-foreground">
                  CA avg / Exam avg
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Grade legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Grade legend</span>
          {scheme.boundaries.map((b) => (
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
          {classSubjects.length} subjects
        </Badge>
        <Badge variant="outline" className="font-normal">
          {results.length} students
        </Badge>
        <Badge variant="outline" className="font-normal tabular">
          {allMarks.length} marks recorded
        </Badge>
        <span>
          Columns follow the class subject order (set on the Class subjects page); <span className="font-medium">*</span> marks a
          subsidiary subject taken by enrolled students only — everyone else shows “—”. Averages count entered marks only
          (blanks excluded from both sum and count); class total = avg(CA) × w1 + avg(Exam) × w2. Division is computed
          from the best 7 graded subject points — students with fewer than 7 graded subjects show “—”.
        </span>
      </div>
    </div>
  );
}
