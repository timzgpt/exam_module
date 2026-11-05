"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCycleContext } from "@/hooks/use-academic-context";
import { DeadlineTrackerView } from "./deadline-tracker-view";
import { ReadinessGateView } from "./readiness-gate-view";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TAB_VALUES = ["tracker", "gate"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function normalizeTab(value: string | null, fallback: TabValue): TabValue {
  return value === "gate" || value === "tracker" ? value : fallback;
}

interface CycleReadinessHostProps {
  /** Tab shown when the URL carries no ?tab= parameter. */
  initialTab?: TabValue;
}

/**
 * Merged host for the former "Marks deadline tracker" and "Readiness check"
 * pages. Both original routes stay live as thin wrappers that open the
 * matching tab; the active tab is mirrored to ?tab= so views stay shareable.
 */
export function CycleReadinessHost({ initialTab = "tracker" }: CycleReadinessHostProps) {
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Readiness & deadlines"
        description={`${cycle.name}. Track subject mark sheets, then confirm the cycle is ready for batch generation.`}
        actions={
          tab === "gate" ? (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link href="/academic/report-cycles">
                  <ArrowLeft className="size-4" /> All cycles
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  toast({
                    title: "Readiness recalculated",
                    description:
                      "Figures reflect the current marks, comments and approvals in this demo.",
                  })
                }
              >
                <RefreshCw className="size-4" /> Recalculate
              </Button>
            </>
          ) : undefined
        }
      />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="min-h-9">
          <TabsTrigger value="tracker" className="px-3.5 text-compact">
            Deadline tracker
          </TabsTrigger>
          <TabsTrigger value="gate" className="px-3.5 text-compact">
            Readiness gate
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="mt-5">
          <DeadlineTrackerView />
        </TabsContent>
        <TabsContent value="gate" className="mt-5">
          <ReadinessGateView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
