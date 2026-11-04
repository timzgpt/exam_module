"use client";

import { PageHeader } from "@/components/shared/page-header";
import { GradePill } from "@/components/shared/grade-pill";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DEMO_IDS, routes } from "@/lib/demo-config";
import {
  classById,
  classNameOf,
  currentCycle,
  defaultScheme,
  studentById,
  studentResultOf,
  subjectRemark,
  subjects,
  studentsInClass,
  targetFor,
  teacherById,
} from "@/lib/demo-data";
import { formatAvg, gradeFor } from "@/lib/grading";
import type { Student, Subject } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  CalendarDays,
  Lightbulb,
  Target,
  User,
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

/** Tiny stable string hash (Java-style, can be negative). */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Pseudo previous-term delta: stable per subject+student, roughly −12…+8. */
function prevTermDelta(subjectId: string, studentId: string): number {
  return (hashStr(subjectId + studentId) % 11) - 2;
}

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
                "flex size-7 shrink-0 items-center justify-center rounded-full text-2xs font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {initialsOf(kid.name)}
            </span>
            <span className="flex flex-col leading-tight">
              <span className={cn("text-compact font-medium", active ? "text-primary" : "text-foreground")}>
                {firstName(kid.name)}
              </span>
              <span className="text-2xs text-muted-foreground">{classNameOf(kid.classId)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Page ---------------------------------------------------------------- */

export default function PortalProgressPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDS.studentId);

  const child = children.find((c) => c.id === selectedId) ?? children[0];
  if (!child) return null;

  const result = studentResultOf(child.id);
  const target = targetFor(child.id);
  const classTeacher = teacherById(classById(child.classId)?.classTeacherId);
  const classSize = studentsInClass(child.classId).length;

  const marked: { sub: Subject; mark: number }[] = subjects
    .map((sub) => ({ sub, mark: result ? result.marks[sub.id] ?? null : null }))
    .filter((row): row is { sub: Subject; mark: number } => row.mark !== null)
    .sort((a, b) => a.mark - b.mark);

  const lowest = marked[0];
  const secondLowest = marked[1];
  const best = marked[marked.length - 1];

  const recommendations: string[] = [];
  if (lowest) {
    recommendations.push(`Attend ${lowest.sub.name} remedial sessions on Thursdays.`);
  }
  if (secondLowest) {
    recommendations.push(`Complete 2 past papers per week in ${secondLowest.sub.name}.`);
  }
  if (best) {
    recommendations.push(
      `Keep up the strong work in ${best.sub.name}. The best result this term.`,
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress & targets"
        description="Term 1 · 2026 marks, trends and focus areas for your child."
      />

      <ChildChips kids={children} selectedId={selectedId} onSelect={setSelectedId} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Term average"
          value={result ? formatAvg(result.average) : "-"}
          icon={BarChart3}
          hint={`${currentCycle.term} · ${currentCycle.academicYear}`}
        />
        <StatCard
          label="Position"
          value={result ? `${result.rank} of ${classSize}` : "-"}
          icon={Award}
          hint={`${classNameOf(child.classId)} ranking`}
        />
        <StatCard
          label="Target average"
          value={target.targetAverage}
          icon={Target}
          tone="primary"
          hint="Agreed for next term"
        />
        <StatCard
          label="Class teacher"
          value={classTeacher?.name ?? "-"}
          icon={User}
          hint={classNameOf(child.classId)}
        />
      </div>

      <SectionCard
        title="Subject progress"
        description="This term's mark, the change from last term and progress toward the target average."
      >
        <div className="divide-y divide-border/70">
          {subjects.map((sub) => {
            const mark = result ? result.marks[sub.id] ?? null : null;
            const grade = mark !== null ? gradeFor(mark, defaultScheme)?.grade ?? null : null;
            const delta = mark !== null ? prevTermDelta(sub.id, child.id) : 0;
            const up = delta > 0;
            const pct =
              mark !== null ? Math.min(100, Math.round((mark / target.targetAverage) * 100)) : 0;
            return (
              <div key={sub.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-compact font-medium text-foreground">{sub.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {mark !== null ? subjectRemark(mark) : "Not assessed yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {mark !== null ? (
                      delta === 0 ? (
                        <span className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                          0
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-2xs font-medium",
                            up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                          )}
                        >
                          {up ? (
                            <ArrowUpRight className="size-3" />
                          ) : (
                            <ArrowDownRight className="size-3" />
                          )}
                          {up ? "+" : "−"}
                          {Math.abs(delta)}
                        </span>
                      )
                    ) : null}
                    <span className="w-7 text-right text-sm font-semibold tabular text-foreground">
                      {mark ?? "-"}
                    </span>
                    {grade ? (
                      <GradePill grade={grade} />
                    ) : (
                      <span className="flex size-6 items-center justify-center text-muted-foreground">
                        -
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <Progress value={pct} className="h-1.5 flex-1" aria-label={`${sub.name} progress toward target`} />
                  <span className="shrink-0 text-2xs tabular text-muted-foreground">
                    Target {target.targetAverage}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Focus areas & recommendations"
        description={`What ${firstName(child.name)} should work on before next term.`}
      >
        <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3.5">
          <Target className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-compact font-medium text-foreground">Focus area: {target.focus}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Target average {target.targetAverage}. Currently{" "}
              {result ? formatAvg(result.average) : "-"}.
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5">
          {recommendations.map((rec) => (
            <li key={rec} className="flex items-start gap-2.5">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-compact leading-relaxed text-foreground">{rec}</p>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-col gap-2.5 rounded-lg border border-border/80 bg-muted/40 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Discuss these targets with the class teacher on parents&apos; day.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => router.push(routes.portalParentsDay)}
          >
            <CalendarDays className="size-4" /> Open parents&apos; day
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}
