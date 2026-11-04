"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, type BadgeTone } from "@/components/shared/status-badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParams } from "next/navigation";
import { Award, Building2, Percent, Target } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { cycleById, currentCycle, cycleStatsFor, departmentStats } from "@/lib/demo-data";
import { formatAvg } from "@/lib/grading";

const subjectChartConfig = {
  avg: { label: "Mean score", color: "var(--primary)" },
} satisfies ChartConfig;

/** Complete when every entry is in, Partial when some are, Overdue when none. */
function submissionStatus(done: number, total: number): { tone: BadgeTone; label: string } {
  if (total > 0 && done >= total) return { tone: "success", label: "Complete" };
  if (done > 0) return { tone: "warning", label: "Partial" };
  return { tone: "destructive", label: "Overdue" };
}

export default function DepartmentsPage() {
  const params = useParams<{ cycleId?: string }>();
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;

  const deptStats = departmentStats();
  const stats = cycleStatsFor(cycle.id);

  const best = deptStats.reduce((a, b) => (b.avg > a.avg ? b : a));
  const lowestSubject = [...stats.subjectAverages].sort((a, b) => a.avg - b.avg)[0];
  const submissionRate = Math.round(
    deptStats.reduce((a, d) => a + d.submissionRate, 0) / deptStats.length,
  );
  const subjectChartData = [...stats.subjectAverages].sort((a, b) => b.avg - a.avg);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Departments"
        description={`HOD summary for ${cycle.name}. Subject performance, pass rates and marks submission by department.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Departments" value={deptStats.length} icon={Building2} hint="Subject groupings across the school" />
        <StatCard
          label="Best department"
          value={best.department}
          icon={Award}
          tone="success"
          hint={`Mean ${formatAvg(best.avg)} · ${best.passRate}% pass rate`}
        />
        <StatCard
          label="Lowest subject"
          value={lowestSubject.name}
          icon={Target}
          tone="warning"
          hint={`Mean ${formatAvg(lowestSubject.avg)} · ${lowestSubject.department}`}
        />
        <StatCard
          label="Marks submission"
          value={`${submissionRate}%`}
          icon={Percent}
          tone={submissionRate >= 90 ? "success" : submissionRate >= 60 ? "warning" : "destructive"}
          hint="Average across all departments"
        />
      </div>

      <SectionCard
        title="Department overview"
        description="Head of department, subject coverage and marks submission progress."
        noPadding
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-40 pl-4">Department</TableHead>
                <TableHead>HOD</TableHead>
                <TableHead className="text-center">Subjects</TableHead>
                <TableHead>Mean score</TableHead>
                <TableHead>Pass rate</TableHead>
                <TableHead className="min-w-42 pr-4">Submission progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deptStats.map((dept) => (
                <TableRow key={dept.department}>
                  <TableCell className="pl-4">
                    <p className="text-compact font-medium text-foreground">{dept.department}</p>
                    <p className="text-xs text-muted-foreground">
                      {dept.subjects.map((s) => s.name).join(", ")}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-compact">{dept.hodName}</TableCell>
                  <TableCell className="text-center text-compact tabular">{dept.subjects.length}</TableCell>
                  <TableCell className="text-compact tabular">{formatAvg(dept.avg)}</TableCell>
                  <TableCell className="text-compact tabular">{dept.passRate}%</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center gap-2">
                      <Progress value={dept.submissionRate} className="h-1.5 w-28" />
                      <span className="w-9 text-right text-xs tabular text-muted-foreground">
                        {dept.submissionRate}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard
        title="Subject comparison"
        description="Mean score of every subject across all classes. Departments are compared on these averages."
      >
        <ChartContainer config={subjectChartConfig} className="h-[280px] w-full">
          <BarChart data={subjectChartData} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={118} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="avg" className="fill-primary" radius={[0, 4, 4, 0]} barSize={13} />
          </BarChart>
        </ChartContainer>
      </SectionCard>

      <SectionCard
        title="Department detail"
        description="Subject results and teacher marks submission for each department."
      >
        <Tabs defaultValue={deptStats[0]?.department} className="gap-3">
          <TabsList className="h-8 flex-wrap">
            {deptStats.map((dept) => (
              <TabsTrigger key={dept.department} value={dept.department} className="h-7 px-2.5 text-xs">
                {dept.department}
              </TabsTrigger>
            ))}
          </TabsList>

          {deptStats.map((dept) => (
            <TabsContent key={dept.department} value={dept.department} className="space-y-3">
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-3">Subject</TableHead>
                      <TableHead>Mean</TableHead>
                      <TableHead className="pr-3">Pass rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dept.subjects.map((sub) => (
                      <TableRow key={sub.subjectId}>
                        <TableCell className="pl-3 text-compact font-medium text-foreground">{sub.name}</TableCell>
                        <TableCell className="text-compact tabular">{formatAvg(sub.avg)}</TableCell>
                        <TableCell className="pr-3 text-compact tabular">{sub.passRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="pl-3">Teacher</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Entries</TableHead>
                      <TableHead className="min-w-38">Progress</TableHead>
                      <TableHead className="pr-3">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dept.teachers.map((t) => {
                      const status = submissionStatus(t.done, t.total);
                      return (
                        <TableRow key={`${t.name}-${t.subject}`}>
                          <TableCell className="pl-3 text-compact font-medium text-foreground">{t.name}</TableCell>
                          <TableCell className="text-compact text-muted-foreground">{t.subject}</TableCell>
                          <TableCell className="text-compact tabular">
                            {t.done}/{t.total}
                          </TableCell>
                          <TableCell>
                            <Progress
                              value={t.total > 0 ? Math.round((t.done / t.total) * 100) : 0}
                              className="h-1.5 w-28"
                            />
                          </TableCell>
                          <TableCell className="pr-3">
                            <StatusBadge tone={status.tone} label={status.label} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </SectionCard>
    </div>
  );
}
