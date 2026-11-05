"use client";

import { PageHeader } from "@/components/shared/page-header";
import { ChildChips } from "@/components/portal/child-chips";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useParentChildren } from "@/hooks/use-parent-children";
import { HoldPanel, NoHoldPanel } from "./hold-panel";
import { ProgressView } from "./progress-view";
import { ReportCardView } from "./report-card-view";
import { DEMO_IDS } from "@/lib/demo-config";
import { releaseFor } from "@/lib/demo-data";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const TAB_VALUES = ["card", "progress"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function normalizeTab(value: string | null, fallback: TabValue): TabValue {
  return value === "card" || value === "progress" ? value : fallback;
}

interface ParentReportsHubProps {
  /** Tab shown when the URL carries no ?tab= parameter. */
  initialTab?: TabValue;
}

/**
 * Merged host for the former parent-portal pages (report cards, card on
 * hold, progress & targets): one hub with a shared child selector. A held
 * card renders the hold explanation in place of the card, so the on-hold
 * route simply opens this hub on the card tab.
 */
export function ParentReportsHub({ initialTab = "card" }: ParentReportsHubProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const children = useParentChildren();
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDS.studentId);

  const tab = normalizeTab(searchParams.get("tab"), initialTab);

  const onTabChange = (value: string) => {
    const next = normalizeTab(value, initialTab);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const child = children.find((c) => c.id === selectedId) ?? children[0];
  if (!child) return null;

  const hold = releaseFor(child.classId).hold;

  return (
    <div className="space-y-5">
      <PageHeader
        title="My children's reports"
        description="Term 1 · 2026 report cards, hold status and progress for your children."
      />

      {/* Child selector: screen only */}
      <div className="print:hidden">
        <ChildChips kids={children} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <div className="print:hidden">
        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="min-h-9">
            <TabsTrigger value="card" className="px-3.5 text-compact">
              Report card
            </TabsTrigger>
            <TabsTrigger value="progress" className="px-3.5 text-compact">
              Progress &amp; targets
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "card" ? (
        <div className="mt-5">
          {hold ? (
            <HoldPanel
              child={child}
              reason={hold.reason}
              detail={hold.detail}
              onOpenProgress={() => onTabChange("progress")}
            />
          ) : (
            <ReportCardView child={child} />
          )}
        </div>
      ) : (
        <div className="mt-5">
          <ProgressView child={child} />
        </div>
      )}
    </div>
  );
}
