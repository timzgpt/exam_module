"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClassContext, useCycleContext } from "@/hooks/use-academic-context";
import { useClassTemplateKind } from "@/hooks/use-class-template";
import { isNurseryTemplateKind } from "@/lib/report-templates";
import { ResultsAnalysisView } from "./results-analysis-view";
import { TargetsView } from "./targets-view";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
  // Early Years classes have no marks to analyse — point at the surfaces
  // that actually apply to them (template config + assessment entry).
  const templateKind = useClassTemplateKind(cls.id);
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

  if (isNurseryTemplateKind(templateKind)) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={`Results & targets: ${cls.name}`}
          description={`${cycle.name} · Early Years class — reports carry observations and competency levels, not marks.`}
        />
        <SectionCard className="py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No marks analysis for Early Years classes
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            {cls.name} is assessed on learning-area benchmarks (descriptive remarks or
            B/D/C/HC competency levels). Configure the class template or enter the
            term&apos;s assessments instead.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild>
              <Link href="/academic/report-templates">Open Report templates</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/academic/report-cycles/${cycle.id}/classes/${cls.id}/marks`}>
                Enter assessments
              </Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

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
