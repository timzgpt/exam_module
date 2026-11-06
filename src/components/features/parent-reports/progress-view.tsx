"use client";

import { GradePill } from "@/components/shared/grade-pill";
import { SectionCard } from "@/components/shared/section-card";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { routes } from "@/lib/demo-config";
import {
  classById,
  classNameOf,
  currentCycle,
  getComponents,
  schemeForClass,
  studentResultOf,
  subjectById,
  subjectComment,
  studentsInClass,
  targetFor,
  teacherById,
} from "@/lib/demo-data";
import { formatAvg, gradeFor } from "@/lib/grading";
import { firstName } from "@/lib/format";
import type { Student } from "@/lib/types";
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
import { useEffectiveClassSubjects } from "@/lib/academic-store";

/** Tiny stable string hash (Java-style, can be negative). Distinct from the
 * FNV-1a hashStr in demo-data; kept page-local on purpose. */
function hashString31(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Pseudo previous-term delta: stable per subject+student, roughly −12…+8. */
function prevTermDelta(subjectId: string, studentId: string): number {
  return (hashString31(subjectId + studentId) % 11) - 2;
}

/** Progress & targets view of the parent hub, for one child. */
export function ProgressView({ child }: { child: Student }) {
  const router = useRouter();

  const result = studentResultOf(child.id);
  const target = targetFor(child.id);
  const classTeacher = teacherById(classById(child.classId)?.classTeacherId);
  const classSize = studentsInClass(child.classId).length;
  const scheme = schemeForClass(child.classId);

  // Class-subject order (set on the Class subjects page); non-enrolled
  // subsidiaries stay in the list with "—".
  const classSubjects = useEffectiveClassSubjects(child.classId);
  const subjectRows = classSubjects.map((cs) => {
    const comp = getComponents(child.classId, cs.subjectId)[child.id];
    return {
      sub: subjectById(cs.subjectId)!,
      enrolled: comp?.enrolled ?? true,
      mark: result ? result.marks[cs.subjectId] ?? null : null,
      ca: comp?.ca ?? null,
      exam: comp?.exam ?? null,
    };
  });

  const marked = subjectRows
    .filter((row) => row.mark !== null)
    .map((row) => ({ sub: row.sub, mark: row.mark as number }))
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
          {subjectRows.map(({ sub, enrolled, mark, ca, exam }) => {
            const grade = mark !== null ? gradeFor(mark, scheme)?.grade ?? null : null;
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
                      {!enrolled
                        ? "Not taking this subject"
                        : mark !== null
                          ? subjectComment(child.id, sub.id, mark, scheme, {
                              ca,
                              exam,
                            })
                          : "Not assessed yet"}
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
                      {enrolled && mark !== null ? mark : <span className="font-normal text-muted-foreground">—</span>}
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
