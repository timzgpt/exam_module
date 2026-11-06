"use client";

import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCycleContext } from "@/hooks/use-academic-context";
import { Copy, Globe, Info, Lock } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { useState } from "react";
import { SCHOOL } from "@/lib/demo-config";
import { cycleStatsFor } from "@/lib/demo-data";
import { formatAvg } from "@/lib/grading";

const gradeChartConfig = {
  count: { label: "Marks", color: "var(--primary)" },
} satisfies ChartConfig;

const classChartConfig = {
  avg: { label: "Average", color: "var(--primary)" },
} satisfies ChartConfig;

interface SwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function SwitchRow({ label, description, checked, onChange }: SwitchRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-compact font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

interface PublicationSettings {
  grades: boolean;
  subjects: boolean;
  classes: boolean;
}

/** Public summary view of the Cycle analytics host. */
export function AnalyticsPublicSummaryView() {
  const { toast } = useToast();
  const { cycle } = useCycleContext();

  const stats = cycleStatsFor(cycle.id);
  const [settings, setSettings] = useState<PublicationSettings>({
    grades: true,
    subjects: true,
    classes: false,
  });

  const gradeData = Object.entries(stats.gradeDistribution).map(([grade, count]) => ({
    grade,
    count,
  }));
  const classData = stats.classAverages.map((c) => ({ name: c.name, avg: c.avg }));
  const nothingPublished = !settings.grades && !settings.subjects && !settings.classes;

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Public link copied",
        description: "Anyone with the link can view the published summary.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Your browser blocked clipboard access. Copy the address bar URL instead.",
      });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning/8 p-3 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-warning-strong" />
        <p className="text-compact leading-relaxed text-warning-strong">
          Only aggregated statistics are published. Student names, admission numbers and individual
          marks never appear on the public page.
        </p>
      </div>

      <SectionCard
        title="Publication settings"
        description="Choose which aggregated sections appear on the public page."
        actions={
          <>
            <StatusBadge tone="success" label="Published" />
            <Button variant="outline" size="sm" className="gap-1.5" onClick={copyPublicLink}>
              <Copy className="size-4" /> Copy public link
            </Button>
          </>
        }
      >
        <div className="divide-y divide-border/70">
          <SwitchRow
            label="Show grade distribution"
            description="Counts of A-F grades across all submitted marks."
            checked={settings.grades}
            onChange={(v) => setSettings((s) => ({ ...s, grades: v }))}
          />
          <SwitchRow
            label="Show subject averages"
            description="Mean score for each subject, aggregated over every class."
            checked={settings.subjects}
            onChange={(v) => setSettings((s) => ({ ...s, subjects: v }))}
          />
          <SwitchRow
            label="Show class comparison"
            description="Mean score per class. Class names appear; individual students never do."
            checked={settings.classes}
            onChange={(v) => setSettings((s) => ({ ...s, classes: v }))}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Public preview. What visitors see"
        description="Exactly what the public page renders with the current settings."
      >
        {nothingPublished ? (
          <EmptyState
            icon={Globe}
            title="Nothing published yet"
            description="Turn on at least one section above to compose the public summary."
          />
        ) : (
          <div className="rounded-lg border border-border/80 p-5">
            <div className="text-center">
              <h3 className="text-base font-semibold tracking-tight text-foreground">{SCHOOL.name}</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {cycle.term} {cycle.academicYear} results summary
              </p>
            </div>

            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-3">
              <div className="rounded-lg border border-border/80 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Overall average</p>
                <p className="mt-1 text-2xl font-semibold tabular text-foreground">
                  {formatAvg(stats.average)}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 px-4 py-3 text-center">
                <p className="text-xs text-muted-foreground">Pass rate</p>
                <p className="mt-1 text-2xl font-semibold tabular text-foreground">{stats.passRate}%</p>
              </div>
            </div>

            {settings.grades ? (
              <div className="mt-5">
                <h4 className="text-compact font-medium text-foreground">Grade distribution</h4>
                <ChartContainer config={gradeChartConfig} className="mt-2 h-[170px] w-full">
                  <BarChart data={gradeData}>
                    <XAxis dataKey="grade" tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis width={28} tickLine={false} axisLine={false} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" className="fill-primary" radius={[4, 4, 0, 0]} barSize={26} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : null}

            {settings.subjects ? (
              <div className="mt-5">
                <h4 className="text-compact font-medium text-foreground">Subject averages</h4>
                <div className="mt-2 space-y-2">
                  {stats.subjectAverages.map((s) => (
                    <div key={s.subjectId} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 truncate text-compact text-foreground">{s.name}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.round(s.avg)}%` }}
                        />
                      </div>
                      <span className="w-9 text-right text-compact tabular text-muted-foreground">
                        {formatAvg(s.avg)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {settings.classes ? (
              <div className="mt-5">
                <h4 className="text-compact font-medium text-foreground">Class comparison</h4>
                <ChartContainer config={classChartConfig} className="mt-2 h-[170px] w-full">
                  <BarChart data={classData} layout="vertical" margin={{ right: 16 }}>
                    <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" width={64} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="avg" className="fill-primary" radius={[0, 4, 4, 0]} barSize={13} />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : null}

            <p className="mt-6 border-t border-border/70 pt-3 text-center text-xs text-muted-foreground">
              Issued by {SCHOOL.name}
            </p>
          </div>
        )}
      </SectionCard>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Preview updates instantly; the public page reflects these settings when published.
      </p>
    </div>
  );
}
