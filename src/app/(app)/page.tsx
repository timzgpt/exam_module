"use client";

import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { resolveHref, SCHOOL } from "@/lib/demo-config";
import { currentCycle } from "@/lib/demo-data";
import { NAV_GROUPS } from "@/lib/nav";
import { useNavContext } from "@/lib/store";
import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const { cycleId, classId, studentId } = useNavContext();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative overflow-hidden rounded-xl border border-border bg-primary px-6 py-8 text-primary-foreground sm:px-9 sm:py-10">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
            {SCHOOL.name}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Exams &amp; Report Cards
          </h1>
          <p className="mt-2 max-w-xl text-sm text-primary-foreground/75">
            One workspace for exam administration, marks entry, report
            generation, release and the parent portal: {currentCycle.term}{" "}
            {currentCycle.academicYear} is currently in review.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
              onClick={() => router.push("/academic/exams")}
            >
              Open Exams
              <ChevronRight className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              onClick={() => router.push("/academic/report-cycles")}
            >
              Report cycles
            </Button>
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-16 size-64 rounded-full bg-white/5"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-24 size-72 rounded-full bg-white/[0.04]"
        />
      </div>

      <PageHeader
        className="mt-8"
        title="Module map"
        description="Every page of the Exams & Report Cards module, grouped by area. Pages marked with the current cycle or class use the contextual selection from the header."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {NAV_GROUPS.map((group) => (
          <section
            key={group.label}
            className="overflow-hidden rounded-xl border border-border/80 bg-card"
          >
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground">
                {group.label}
              </h2>
              <StatusBadge
                dot={false}
                tone="neutral"
                label={`${group.items.length} page${group.items.length === 1 ? "" : "s"}`}
              />
            </div>
            <ul className="divide-y divide-border/60">
              {group.items.map((item) => {
                const href = resolveHref(item.hrefTemplate, {
                  cycleId,
                  classId,
                  studentId,
                });
                return (
                  <li key={item.key}>
                    <button
                      onClick={() => router.push(href)}
                      className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-compact font-medium text-foreground">
                          {item.label}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
