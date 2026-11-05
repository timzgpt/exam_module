"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge, toneForStatus, labelForStatus } from "@/components/shared/status-badge";
import { CreateCycleDialog } from "@/components/features/report-cycles/create-cycle-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEMO_IDS, SCHOOL } from "@/lib/demo-config";
import { cycles as demoCycles, currentCycle, parentsDayEvent } from "@/lib/demo-data";
import { useAppContext } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  CalendarClock,
  CalendarRange,
  CalendarX2,
  Eye,
  Globe,
  Layers,
  LayoutDashboard,
  ListChecks,
  Plus,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { CycleStatus } from "@/lib/types";
import { ACADEMIC_APPROVER, DEMO_TODAY } from "@/lib/demo-config";

const CYCLE_STEPS: CycleStatus[] = ["preparation", "marks-entry", "review", "approved", "released"];
const STEP_LABELS: Record<CycleStatus, string> = {
  preparation: "Preparation",
  "marks-entry": "Marks entry",
  review: "Review",
  approved: "Approved",
  released: "Released",
};

function daysUntil(dateStr: string): number {
  const ms =
    new Date(`${dateStr}T00:00:00Z`).getTime() - new Date(`${DEMO_TODAY}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Five-dot progress indicator: preparation → marks entry → review → approved → released. */
function CycleSteps({ status }: { status: CycleStatus }) {
  const idx = CYCLE_STEPS.indexOf(status);
  return (
    <div className="flex items-center" title={`${STEP_LABELS[status]} · step ${idx + 1} of 5`}>
      {CYCLE_STEPS.map((step, i) => (
        <span key={step} className="flex items-center">
          <span
            className={cn(
              "size-2 rounded-full",
              i < idx && "bg-primary",
              i === idx && "bg-primary ring-2 ring-primary/25",
              i > idx && "bg-muted-foreground/25",
            )}
          />
          {i < CYCLE_STEPS.length - 1 ? <span className="h-px w-2.5 bg-border" /> : null}
        </span>
      ))}
      <span className="ml-2 hidden text-xs text-muted-foreground lg:inline">
        {STEP_LABELS[status]}
      </span>
    </div>
  );
}

export default function ReportCyclesPage() {
  const createdCycles = useAppContext((s) => s.createdCycles);
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDS.reportCycleId);
  const [createOpen, setCreateOpen] = useState(false);

  // Built-in demo cycles plus every cycle created through the dialog —
  // created cycles persist in the context store, so they survive reloads.
  const cycles = useMemo(() => [...demoCycles, ...createdCycles], [createdCycles]);

  const active = cycles.find((c) => c.id === DEMO_IDS.reportCycleId) ?? currentCycle;
  const selected = cycles.find((c) => c.id === selectedId) ?? active;
  const daysToClose = daysUntil(active.closingDate);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report cycles"
        description="Term reporting windows. Prepare, collect marks, review, approve and release report cards."
        actions={
          <>
            <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New cycle
            </Button>
            {/* Redesigned creation flow: a cycle combines exams into one
                report card (components with labels + weights; the Annual
                Exam always runs on its own). */}
            <CreateCycleDialog open={createOpen} onOpenChange={setCreateOpen} />
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active cycle"
          value={`${active.term} · ${active.academicYear}`}
          icon={Layers}
          tone="primary"
          hint={active.name}
        />
        <StatCard
          label="Closes in"
          value={daysToClose >= 0 ? `${daysToClose} days` : "Closed"}
          icon={CalendarClock}
          tone={daysToClose >= 0 ? "warning" : "destructive"}
          hint={`Marks close ${active.closingDate}`}
        />
        <StatCard
          label="Release date"
          value={active.releaseDate}
          icon={Globe}
          tone="success"
          hint="Report cards go live to parents"
        />
        <StatCard
          label="Parents' day"
          value={active.parentsDayDate}
          icon={Users}
          hint={parentsDayEvent.window}
        />
      </div>

      {/* Cycles table */}
      <SectionCard
        noPadding
        title="All cycles"
        description="Click a row to inspect its configuration below."
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="min-w-55 pl-4">Cycle</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles.map((cycle) => {
                const isActive = cycle.id === DEMO_IDS.reportCycleId;
                const isCreated = cycle.id.startsWith("cy-");
                return (
                  <TableRow
                    key={cycle.id}
                    className={cn(
                      "cursor-pointer",
                      selectedId === cycle.id && "bg-muted/30",
                    )}
                    onClick={() => setSelectedId(cycle.id)}
                  >
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-2">
                        <p className="text-compact font-medium text-foreground">{cycle.name}</p>
                        {isActive ? <StatusBadge tone="primary" label="Current" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {cycle.term} · {cycle.academicYear}
                        {cycle.components && cycle.components.length > 1
                          ? ` · ${cycle.components
                              .map((c) => `${c.label} ${c.weight}%`)
                              .join(" + ")}`
                          : ""}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-compact tabular text-muted-foreground">
                      {cycle.startDate} → {cycle.endDate}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={toneForStatus(cycle.status)}
                        label={labelForStatus(cycle.status)}
                      />
                    </TableCell>
                    <TableCell>
                      <CycleSteps status={cycle.status} />
                    </TableCell>
                    <TableCell className="pr-4 text-right">
                      <div
                        className="flex flex-wrap items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isActive ? (
                          <>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" asChild>
                              <Link href={`/academic/report-cycles/${cycle.id}/readiness`}>
                                <ListChecks className="size-3.5" /> Readiness
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" asChild>
                              <Link href={`/academic/report-cycles/${cycle.id}/dashboard`}>
                                <LayoutDashboard className="size-3.5" /> Dashboard
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" asChild>
                              <Link href={`/academic/report-cycles/${cycle.id}/release`}>
                                <Send className="size-3.5" /> Release
                              </Link>
                            </Button>
                          </>
                        ) : isCreated ? (
                          <>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" asChild>
                              <Link href={`/academic/report-cycles/${cycle.id}/dashboard`}>
                                <LayoutDashboard className="size-3.5" /> Open
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs" asChild>
                              <Link
                                href={`/academic/report-cycles/${cycle.id}/classes/${DEMO_IDS.classId}/marks`}
                              >
                                <ListChecks className="size-3.5" /> Marks
                              </Link>
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 px-2.5 text-xs"
                            onClick={() => setSelectedId(cycle.id)}
                          >
                            <Eye className="size-3.5" /> Details
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Configuration details */}
      <SectionCard
        title="Cycle configuration"
        description={`${selected.name} · ${selected.term} ${selected.academicYear} · ${selected.startDate} → ${selected.endDate}`}
        actions={
          <StatusBadge tone={toneForStatus(selected.status)} label={labelForStatus(selected.status)} />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/70 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarX2 className="size-3.5" /> Marks closing date
            </p>
            <p className="mt-1.5 text-sm font-semibold tabular text-foreground">
              {selected.closingDate}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {daysUntil(selected.closingDate) >= 0
                ? `${daysUntil(selected.closingDate)} days from demo today`
                : "Window closed"}
            </p>
          </div>
          <div className="rounded-lg border border-border/70 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="size-3.5" /> Release date
            </p>
            <p className="mt-1.5 text-sm font-semibold tabular text-foreground">
              {selected.releaseDate}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">Reports visible in the parent portal</p>
          </div>
          <div className="rounded-lg border border-border/70 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarCheck className="size-3.5" /> Parents' day
            </p>
            <p className="mt-1.5 text-sm font-semibold tabular text-foreground">
              {selected.parentsDayDate}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{parentsDayEvent.window}</p>
          </div>
          <div className="rounded-lg border border-border/70 px-3 py-3">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Approver
            </p>
            <p className="mt-1.5 text-sm font-semibold text-foreground">{ACADEMIC_APPROVER}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Deputy Head · Academics</p>
          </div>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarRange className="size-3.5" />
          Cycle window: {selected.startDate} → {selected.endDate}. Teachers submit marks and comments
          before the closing date; Mrs. Nyoni reviews and approves each class before release.
        </p>
      </SectionCard>
    </div>
  );
}
