"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useNurseryAssessment,
  useClassTemplateConfig,
} from "@/hooks/use-class-template";
import { classNameOf, studentsInClass } from "@/lib/demo-data";
import { nurseryPeriodForCycle, templateKindLabel } from "@/lib/report-templates";
import { assessmentKey, useNurseryAssessmentStore } from "@/lib/template-store";
import type { CompetencyCode, ReportCycle } from "@/lib/types";
import { Save } from "lucide-react";

/**
 * Early Years assessment entry (task §5): teachers of a nursery class enter
 * ONLY the assessments their template asks for — descriptive remarks per
 * learning area (Baby Class / KG1) or benchmark competency grades plus a
 * dedicated comment per area (KG2 / KG3) — and the class teacher's separate
 * concluding comment. Grades and remarks are stored independently.
 */
export function NurseryAssessmentEntry({
  classId,
  cycle,
}: {
  classId: string;
  cycle: ReportCycle;
}) {
  const { toast } = useToast();
  const students = useMemo(() => studentsInClass(classId), [classId]);
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "");
  const config = useClassTemplateConfig(classId, nurseryPeriodForCycle(cycle));
  const seed = useNurseryAssessment(classId, studentId, cycle);
  const saveAssessment = useNurseryAssessmentStore((s) => s.saveAssessment);

  const [working, setWorking] = useState(seed);
  useEffect(() => {
    setWorking(seed);
  }, [seed]);

  const student = students.find((s) => s.id === studentId) ?? students[0];
  if (!student) return null;

  const dirty = JSON.stringify(working) !== JSON.stringify(seed);

  const save = () => {
    saveAssessment(assessmentKey(cycle.id, classId, studentId), {
      assessedOn: working.assessedOn,
      benchmarkRemarks: working.benchmarkRemarks,
      benchmarkGrades: working.benchmarkGrades,
      areaComments: working.areaComments,
      classTeacherComment: working.classTeacherComment,
    });
    toast({
      title: "Assessment saved",
      description: `${student.name}'s ${cycle.name} assessment was saved to the report card.`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Early years assessment entry"
        description={`${classNameOf(classId)} · ${cycle.name} — ${
          config.gradesPerBenchmark
            ? "competency grades per benchmark, a comment per learning area and the class teacher's concluding comment."
            : "descriptive remarks per learning area and the class teacher's concluding comment."
        }`}
      />

      {/* Learner switcher */}
      <div className="flex flex-wrap items-center gap-1.5">
        {students.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStudentId(s.id)}
            className={`rounded-full border px-3 py-1 text-compact transition-colors ${
              s.id === studentId
                ? "border-primary/40 bg-secondary font-medium text-secondary-foreground"
                : "border-border bg-white text-foreground hover:bg-muted"
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      <SectionCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-compact font-medium text-foreground">{student.name}</p>
            <p className="text-xs text-muted-foreground">
              {classNameOf(classId)} · {student.admissionNo} · {templateKindLabel(config.kind)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="assessed-on" className="text-xs text-muted-foreground">
              {config.assessmentDateLabel}
            </Label>
            <Input
              id="assessed-on"
              type="date"
              value={working.assessedOn}
              onChange={(e) => setWorking({ ...working, assessedOn: e.target.value })}
              className="h-8 w-40"
            />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {config.areas.map((area, ai) => (
            <div key={area.id} className="rounded-lg border border-border/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-compact font-semibold text-foreground">
                  {ai + 1}. {area.name}
                </p>
                {config.gradesPerBenchmark ? (
                  <Badge variant="outline" className="text-2xs">
                    {config.areaCommentLabel ?? "Comments"} below
                  </Badge>
                ) : null}
              </div>

              {config.gradesPerBenchmark ? (
                <div className="mt-2 space-y-1.5">
                  {area.benchmarks.map((b, bi) => (
                    <div key={b.id} className="flex items-center gap-3">
                      <p className="min-w-0 flex-1 text-compact text-foreground/85">
                        {bi + 1}. {b.text}
                      </p>
                      <Select
                        value={working.benchmarkGrades[b.id] ?? "none"}
                        onValueChange={(v) =>
                          setWorking({
                            ...working,
                            benchmarkGrades: {
                              ...working.benchmarkGrades,
                              [b.id]: (v === "none" ? null : v) as CompetencyCode | null,
                            },
                          })
                        }
                      >
                        <SelectTrigger
                          className="h-8 w-44 text-compact"
                          aria-label={`Competency grade for: ${b.text}`}
                        >
                          <SelectValue placeholder="Not yet assessed" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not yet assessed</SelectItem>
                          {config.scale?.levels.map((l) => (
                            <SelectItem key={l.code} value={l.code}>
                              {l.code} — {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  <div className="grid gap-1.5 pt-1">
                    <Label
                      htmlFor={`area-comment-${area.id}`}
                      className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {config.areaCommentLabel ?? "Comments"} — {area.name}
                    </Label>
                    <Textarea
                      id={`area-comment-${area.id}`}
                      rows={2}
                      value={working.areaComments[area.id] ?? ""}
                      onChange={(e) =>
                        setWorking({
                          ...working,
                          areaComments: {
                            ...working.areaComments,
                            [area.id]: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-2 space-y-2.5">
                  <p className="text-2xs text-muted-foreground">
                    {config.areaRemarkLabel ?? "Teacher's remarks"} — one per benchmark
                  </p>
                  {area.benchmarks.map((b, bi) => (
                    <div key={b.id} className="grid gap-1">
                      <Label
                        htmlFor={`bench-remark-${b.id}`}
                        className="text-2xs font-medium text-foreground/80"
                      >
                        {bi + 1}. {b.text}
                      </Label>
                      <Textarea
                        id={`bench-remark-${b.id}`}
                        rows={2}
                        value={working.benchmarkRemarks[b.id] ?? ""}
                        onChange={(e) =>
                          setWorking({
                            ...working,
                            benchmarkRemarks: {
                              ...working.benchmarkRemarks,
                              [b.id]: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="grid gap-1.5">
            <Label
              htmlFor="ct-comment"
              className="text-2xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              {config.classTeacherCommentLabel}
            </Label>
            <Textarea
              id="ct-comment"
              rows={3}
              value={working.classTeacherComment}
              onChange={(e) =>
                setWorking({ ...working, classTeacherComment: e.target.value })
              }
            />
            <p className="text-2xs text-muted-foreground">
              The class teacher&apos;s comment is stored separately from the learning-area
              remarks and comments.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button className="gap-1.5" onClick={save} disabled={!dirty}>
            <Save className="size-4" /> Save assessment
          </Button>
          <Button variant="outline" onClick={() => setWorking(seed)} disabled={!dirty}>
            Discard changes
          </Button>
          {dirty ? (
            <span className="text-xs text-warning-strong">Unsaved changes</span>
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}
