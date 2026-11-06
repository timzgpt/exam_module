"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCycleContext } from "@/hooks/use-academic-context";
import { AnalyticsOverviewView } from "./analytics-overview-view";
import { AnalyticsDepartmentsView } from "./analytics-departments-view";
import { AnalyticsPublicSummaryView } from "./analytics-public-summary-view";
import { downloadCsv } from "@/lib/csv";
import { cycleStatsFor } from "@/lib/demo-data";
import { formatAvg } from "@/lib/grading";
import { Download } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TAB_VALUES = ["overview", "departments", "public"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function normalizeTab(value: string | null, fallback: TabValue): TabValue {
  if (value === "overview" || value === "departments" || value === "public") return value;
  return fallback;
}

interface CycleAnalyticsHostProps {
  /** Tab shown when the URL carries no ?tab= parameter. */
  initialTab?: TabValue;
}

/**
 * Merged host for the former "Management dashboard", "HOD department
 * summary" and "Public summary" pages: one analytics host, three audiences.
 * All original routes stay live as thin wrappers that open the matching tab;
 * the active tab is mirrored to ?tab= so views stay shareable.
 */
export function CycleAnalyticsHost({ initialTab = "overview" }: CycleAnalyticsHostProps) {
  const { toast } = useToast();
  const { cycle } = useCycleContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = normalizeTab(searchParams.get("tab"), initialTab);

  const onTabChange = (value: string) => {
    const next = normalizeTab(value, initialTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const exportSnapshot = () => {
    const stats = cycleStatsFor(cycle.id);
    const rows: string[][] = [
      ["Report cycle", cycle.name],
      ["Cycle average", formatAvg(stats.average)],
      ["Pass rate", `${stats.passRate}%`],
      ["Marks completion", `${stats.marksCompletion}%`],
      ["Comments completion", `${stats.commentsCompletion}%`],
      [],
      ["Class", "Average"],
      ...stats.classAverages.map((c) => [c.name, formatAvg(c.avg)]),
    ];
    downloadCsv(rows, `dashboard-${cycle.term.toLowerCase().replace(/\s+/g, "-")}-${cycle.academicYear}.csv`);
    toast({
      title: "Snapshot exported",
      description: "KPIs and class averages were downloaded as CSV.",
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cycle analytics"
        description={`${cycle.name}. Executive overview, departmental detail and the controlled public summary.`}
        actions={
          tab === "overview" ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportSnapshot}>
              <Download className="size-4" /> Export snapshot (CSV)
            </Button>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="min-h-9">
          <TabsTrigger value="overview" className="px-3.5 text-compact">
            Overview
          </TabsTrigger>
          <TabsTrigger value="departments" className="px-3.5 text-compact">
            Departments
          </TabsTrigger>
          <TabsTrigger value="public" className="px-3.5 text-compact">
            Public summary
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          <AnalyticsOverviewView />
        </TabsContent>
        <TabsContent value="departments" className="mt-5">
          <AnalyticsDepartmentsView />
        </TabsContent>
        <TabsContent value="public" className="mt-5">
          <AnalyticsPublicSummaryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
