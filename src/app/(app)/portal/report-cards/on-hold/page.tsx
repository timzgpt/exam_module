"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { DEMO_IDS, routes } from "@/lib/demo-config";
import { classNameOf, releaseFor, studentById } from "@/lib/demo-data";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  CircleCheck,
  CirclePause,
  Clock,
  Info,
  Mail,
  Phone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

/* ---- Demo parent context ------------------------------------------------ */

const children: Student[] = [
  studentById(DEMO_IDS.studentId),
  studentById("f1b-04"),
].filter((s): s is Student => Boolean(s));

const firstName = (name: string) => name.split(" ")[0];

const initialsOf = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

interface HoldInfo {
  reason: string;
  detail: string;
}

const HOLD_STEPS = [
  "Visit or contact the bursary to settle the balance or set up a payment plan.",
  "Obtain a clearance slip once the balance is settled.",
  "The report card releases automatically as soon as the clearance is recorded.",
];

/* ---- Child selector chips (mobile: horizontal scroll) ------------------- */

function ChildChips({
  kids,
  selectedId,
  onSelect,
}: {
  kids: Student[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Select a child">
      {kids.map((kid) => {
        const active = kid.id === selectedId;
        return (
          <button
            key={kid.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kid.id)}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2.5 rounded-full border px-3 py-1.5 text-left transition-colors",
              active ? "border-primary bg-primary/8" : "border-border bg-card hover:bg-accent",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {initialsOf(kid.name)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className={cn("text-[13px] font-medium", active ? "text-primary" : "text-foreground")}>
                {firstName(kid.name)}
              </span>
              <span className="text-[11px] text-muted-foreground">{classNameOf(kid.classId)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Hold explanation (card on hold) ------------------------------------ */

function HoldView({
  child,
  hold,
  onOpenProgress,
}: {
  child: Student;
  hold: HoldInfo;
  onOpenProgress: () => void;
}) {
  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#c47a16]/12">
            <CirclePause className="size-6 text-[#c47a16]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Report card on hold</h2>
              <StatusBadge tone="warning" label="On hold" />
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {firstName(child.name)}&apos;s report card cannot be released until the outstanding
              school balance is cleared. The results themselves are fine — the card is simply held
              by the bursary.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 rounded-lg border border-border/80 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <p className="mt-1 text-[13px] font-medium text-foreground">{hold.reason}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Detail
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground">{hold.detail}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-foreground">What you can do</p>
          <ol className="mt-3 space-y-3">
            {HOLD_STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <p className="text-[13px] leading-relaxed text-foreground">{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </SectionCard>

      <SectionCard
        title="Contact the bursary"
        description="Settle the balance or arrange a payment plan."
      >
        <div className="grid gap-2 sm:grid-cols-3">
          <a
            href="tel:+255754000210"
            className="flex min-h-11 items-center gap-3 rounded-lg border border-border/80 px-3 py-2.5 transition-colors hover:bg-accent"
          >
            <Phone className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">+255 754 000 210</span>
              <span className="block text-xs text-muted-foreground">Bursary phone</span>
            </span>
          </a>
          <a
            href="mailto:accounts@josephian.ac.tz"
            className="flex min-h-11 items-center gap-3 rounded-lg border border-border/80 px-3 py-2.5 transition-colors hover:bg-accent"
          >
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">
                accounts@josephian.ac.tz
              </span>
              <span className="block text-xs text-muted-foreground">Bursary email</span>
            </span>
          </a>
          <div className="flex min-h-11 items-center gap-3 rounded-lg border border-border/80 px-3 py-2.5">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-foreground">
                Mon – Fri · 08:00 – 16:00
              </span>
              <span className="block text-xs text-muted-foreground">Office hours</span>
            </span>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            This does not affect your access to progress information — you can still view subjects
            and targets.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={onOpenProgress}>
          View progress
        </Button>
      </div>
    </div>
  );
}

/* ---- Nothing on hold (friendly confirmation) ----------------------------- */

function NoHoldView({ child, onOpen }: { child: Student; onOpen: () => void }) {
  return (
    <SectionCard>
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <CircleCheck className="mb-1 size-6 text-[#16834a]" />
        <p className="text-sm font-medium text-foreground">No cards on hold</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {firstName(child.name)}&apos;s Term 1 report card is available to view and download.
        </p>
        <Button size="sm" className="mt-4" onClick={onOpen}>
          View report card
        </Button>
      </div>
    </SectionCard>
  );
}

/* ---- Page ---------------------------------------------------------------- */

export default function PortalOnHoldPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDS.studentId);

  const child = children.find((c) => c.id === selectedId) ?? children[0];
  if (!child) return null;

  const hold = releaseFor(child.classId).hold;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Held report cards"
        description="When a report card is on hold, this page explains why and what to do next."
      />

      <ChildChips kids={children} selectedId={selectedId} onSelect={setSelectedId} />

      {hold ? (
        <HoldView
          child={child}
          hold={hold}
          onOpenProgress={() => router.push(routes.portalProgress)}
        />
      ) : (
        <NoHoldView child={child} onOpen={() => router.push(routes.portalReportCards)} />
      )}
    </div>
  );
}
