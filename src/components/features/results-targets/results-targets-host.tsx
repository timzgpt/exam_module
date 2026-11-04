"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClassContext, useCycleContext } from "@/hooks/use-academic-context";
import { ResultsAnalysisView } from "./results-analysis-view";
import { TargetsView } from "./targets-view";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TAB_VALUES = ["results", "targets"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function normalizeTab(value: string | null, fallback: TabValue): TabValue {
  return value === "results" || value === "targets" ? value : fallback;
}

interface ResultsTargetsHostProps {
  /** Tab shown when the URL carries no ?tab= parameter. */
  initialTab?: TabValue;
}

/**
 * Merged host for the former "Class results" and "Next-term targets" pages.
 * Both original routes stay live as thin wrappers that open the matching
 * tab; the active tab is mirrored to ?tab= so views stay shareable.
 */
export function ResultsTargetsHost({ initialTab = "results" }: ResultsTargetsHostProps) {
  const { klass: cls } = useClassContext();
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

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Results & targets: ${cls.name}`}
        description={`${cycle.name} · analyse subject marks and ranks, then set next-term targets per student.`}
      />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="min-h-9">
          <TabsTrigger value="results" className="px-3.5 text-compact">
            Results analysis
          </TabsTrigger>
          <TabsTrigger value="targets" className="px-3.5 text-compact">
            Next-term targets
          </TabsTrigger>
        </TabsList>
        <TabsContent value="results" className="mt-5">
          <ResultsAnalysisView />
        </TabsContent>
        <TabsContent value="targets" className="mt-5">
          <TargetsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
