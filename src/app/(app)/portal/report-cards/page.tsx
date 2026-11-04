"use client";

import { PageHeader } from "@/components/shared/page-header";
import { GradePill } from "@/components/shared/grade-pill";
import { SectionCard } from "@/components/shared/section-card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { DEMO_IDS, SCHOOL, routes } from "@/lib/demo-config";
import {
  classById,
  classNameOf,
  commentFor,
  currentCycle,
  defaultScheme,
  releaseFor,
  studentAttendance,
  studentById,
  studentResultOf,
  subjectRemark,
  subjects,
  studentsInClass,
  teacherById,
} from "@/lib/demo-data";
import { formatAvg, gradeFor } from "@/lib/grading";
import type { Student } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Download, TriangleAlert } from "lucide-react";
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

/* ---- Page ---------------------------------------------------------------- */

export default function PortalReportCardsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(DEMO_IDS.studentId);

  const child = children.find((c) => c.id === selectedId) ?? children[0];
  if (!child) return null;

  const result = studentResultOf(child.id);
  const attendance = studentAttendance(child.id);
  const hold = releaseFor(child.classId).hold;
  const comment = commentFor(child.classId, child.id);
  const classTeacher = teacherById(classById(child.classId)?.classTeacherId);
  const classSize = studentsInClass(child.classId).length;

  const downloadPdf = () => {
    toast({
      title: "Opening print dialog",
      description: "Use 'Save as PDF' in the print dialog to keep a copy of the card.",
    });
    window.print();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report cards"
        description="Term 1 · 2026 report cards for your children."
      />

      {/* Child selector — screen only */}
      <div className="print:hidden">
        <ChildChips kids={children} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      {child ? (
        <SectionCard>
          {/* Toolbar — screen only */}
          <div className="print:hidden mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-foreground">
                Terminal report · {firstName(child.name)}
              </p>
              <p className="text-xs text-muted-foreground">
                Use &quot;Save as PDF&quot; in the print dialog to keep a copy.
              </p>
            </div>
            <Button size="sm" className="shrink-0 gap-1.5" onClick={downloadPdf}>
              <Download className="size-4" /> Download PDF
            </Button>
          </div>

          {/* Hold warning strip — screen only */}
          {hold ? (
            <div className="print:hidden mb-5 flex flex-col gap-2.5 rounded-lg border border-[#c47a16]/35 bg-[#c47a16]/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2.5">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#c47a16]" />
                <p className="text-[13px] leading-relaxed text-[#9a5f11]">
                  <span className="font-medium">Card on hold — fees balance.</span> This card is held
                  by the bursary until the outstanding balance is cleared.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => router.push(routes.portalOnHold)}
              >
                View details
              </Button>
            </div>
          ) : null}

          {/* The printable report card */}
          <div className="print-area">
            <div className="border-b border-border pb-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                {SCHOOL.name.toUpperCase()}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {currentCycle.term} {currentCycle.academicYear} Terminal Report
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="text-base font-semibold text-foreground">{child.name}</p>
              <p className="text-[13px] tabular text-muted-foreground">
                {classNameOf(child.classId)} · Admission no. {child.admissionNo}
              </p>
            </div>

            <div className="mt-4 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Mark</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="min-w-[200px]">Teacher&apos;s remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((sub) => {
                    const mark = result ? result.marks[sub.id] ?? null : null;
                    const grade = mark !== null ? gradeFor(mark, defaultScheme)?.grade : null;
                    return (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-foreground">{sub.name}</TableCell>
                        <TableCell className="text-right tabular">{mark ?? "—"}</TableCell>
                        <TableCell className="text-center">
                          {grade ? (
                            <GradePill grade={grade} className="mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[13px] text-muted-foreground">
                          {mark !== null ? subjectRemark(mark) : "Not assessed"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Average
                </p>
                <p className="mt-1 text-xl font-semibold tabular text-foreground">
                  {result ? formatAvg(result.average) : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Position
                </p>
                <p className="mt-1 text-xl font-semibold tabular text-foreground">
                  {result ? `${result.rank} of ${classSize}` : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border/80 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Attendance
                </p>
                <p className="mt-1 text-xl font-semibold tabular text-foreground">
                  {attendance.present}/{attendance.total}{" "}
                  <span className="text-sm font-normal text-muted-foreground">days</span>
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-border/80 bg-muted/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Class teacher&apos;s remark
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-foreground">
                {comment.classTeacher ?? "Awaiting remark"}
              </p>
              {classTeacher ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {classTeacher.name} · Class teacher, {classNameOf(child.classId)}
                </p>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
