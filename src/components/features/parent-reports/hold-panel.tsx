"use client";

import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { BURSARY } from "@/lib/demo-config";
import { firstName } from "@/lib/format";
import type { Student } from "@/lib/types";
import {
  CircleCheck,
  CirclePause,
  Clock,
  Info,
  Mail,
  Phone,
} from "lucide-react";

const HOLD_STEPS = [
  "Visit or contact the bursary to settle the balance or set up a payment plan.",
  "Obtain a clearance slip once the balance is settled.",
  "The report card releases automatically as soon as the clearance is recorded.",
];

interface HoldPanelProps {
  child: Student;
  reason: string;
  detail: string;
  onOpenProgress: () => void;
}

/** Shown in place of the card while the selected child's card is on hold. */
export function HoldPanel({ child, reason, detail, onOpenProgress }: HoldPanelProps) {
  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-warning/12">
            <CirclePause className="size-6 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">Report card on hold</h2>
              <StatusBadge tone="warning" label="On hold" />
            </div>
            <p className="mt-1.5 text-compact leading-relaxed text-muted-foreground">
              {firstName(child.name)}&apos;s report card cannot be released until the outstanding
              school balance is cleared. The results themselves are fine. The card is simply held
              by the bursary.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 rounded-lg border border-border/80 p-4 sm:grid-cols-2">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reason
            </p>
            <p className="mt-1 text-compact font-medium text-foreground">{reason}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Detail
            </p>
            <p className="mt-1 text-compact leading-relaxed text-foreground">{detail}</p>
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
                <p className="text-compact leading-relaxed text-foreground">{step}</p>
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
            href={BURSARY.phoneHref}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-border/80 px-3 py-2.5 transition-colors hover:bg-accent"
          >
            <Phone className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-compact font-medium text-foreground">{BURSARY.phoneDisplay}</span>
              <span className="block text-xs text-muted-foreground">Bursary phone</span>
            </span>
          </a>
          <a
            href={`mailto:${BURSARY.email}`}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-border/80 px-3 py-2.5 transition-colors hover:bg-accent"
          >
            <Mail className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-compact font-medium text-foreground">
                {BURSARY.email}
              </span>
              <span className="block text-xs text-muted-foreground">Bursary email</span>
            </span>
          </a>
          <div className="flex min-h-11 items-center gap-3 rounded-lg border border-border/80 px-3 py-2.5">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-compact font-medium text-foreground">
                Mon. Fri · 08:00-16:00
              </span>
              <span className="block text-xs text-muted-foreground">Office hours</span>
            </span>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-compact leading-relaxed text-muted-foreground">
            This does not affect your access to progress information. You can still view subjects
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

/** Friendly confirmation for a child whose card is NOT on hold. */
export function NoHoldPanel({ child }: { child: Student }) {
  return (
    <SectionCard>
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <CircleCheck className="mb-1 size-6 text-success" />
        <p className="text-sm font-medium text-foreground">No cards on hold</p>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {firstName(child.name)}&apos;s Term 1 report card is available to view and download.
        </p>
      </div>
    </SectionCard>
  );
}
