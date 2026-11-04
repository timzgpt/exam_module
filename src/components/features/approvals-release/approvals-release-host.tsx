"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCycleContext } from "@/hooks/use-academic-context";
import { ApprovalsView } from "./approvals-view";
import { ReleaseView } from "./release-view";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TAB_VALUES = ["approvals", "release"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function normalizeTab(value: string | null, fallback: TabValue): TabValue {
  return value === "approvals" || value === "release" ? value : fallback;
}

interface ApprovalsReleaseHostProps {
  /** Tab shown when the URL carries no ?tab= parameter. */
  initialTab?: TabValue;
}

/**
 * Merged host for the former "Review & approval" and "Release management"
 * pages: one pipeline, Draft → Submitted → Approved → Released. Both original
 * routes stay live as thin wrappers that open the matching tab; the active
 * tab is mirrored to ?tab= so views stay shareable.
 */
export function ApprovalsReleaseHost({ initialTab = "approvals" }: ApprovalsReleaseHostProps) {
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
        title="Approvals & release"
        description={`${cycle.name}. Verify each class submission, approve it, then publish report cards to the parent portal.`}
      />

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList className="min-h-9">
          <TabsTrigger value="approvals" className="px-3.5 text-compact">
            Approvals
          </TabsTrigger>
          <TabsTrigger value="release" className="px-3.5 text-compact">
            Release &amp; holds
          </TabsTrigger>
        </TabsList>
        <TabsContent value="approvals" className="mt-5">
          <ApprovalsView />
        </TabsContent>
        <TabsContent value="release" className="mt-5">
          <ReleaseView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
