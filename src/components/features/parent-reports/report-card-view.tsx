"use client";

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
import { usePrintDownload } from "@/hooks/use-print-download";
import { SCHOOL } from "@/lib/demo-config";
import {
  classById,
  classNameOf,
  commentFor,
  currentCycle,
  defaultScheme,
  studentAttendance,
  studentResultOf,
  subjectRemark,
  subjects,
  studentsInClass,
  teacherById,
} from "@/lib/demo-data";
import { formatAvg, gradeFor } from "@/lib/grading";
import { firstName } from "@/lib/format";
import type { Student } from "@/lib/types";
import { Download } from "lucide-react";

/**
 * Printable report card view of the parent hub, for one child. Rendered only
 * when the child's card is not on hold (held cards show the hold panel).
 */
export function ReportCardView({ child }: { child: Student }) {
  const downloadPdf = usePrintDownload(
    "Use 'Save as PDF' in the print dialog to keep a copy of the card.",
  );

  const result = studentResultOf(child.id);
  const attendance = studentAttendance(child.id);
  const comment = commentFor(child.classId, child.id);
  const classTeacher = teacherById(classById(child.classId)?.classTeacherId);
  const classSize = studentsInClass(child.classId).length;

  return (
    <SectionCard>
      {/* Toolbar: screen only */}
      <div className="print:hidden mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-compact font-medium text-foreground">
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
          <p className="text-compact tabular text-muted-foreground">
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
                <TableHead className="min-w-50">Teacher&apos;s remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((sub) => {
                const mark = result ? result.marks[sub.id] ?? null : null;
                const grade = mark !== null ? gradeFor(mark, defaultScheme)?.grade : null;
                return (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-foreground">{sub.name}</TableCell>
                    <TableCell className="text-right tabular">{mark ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {grade ? (
                        <GradePill grade={grade} className="mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-compact text-muted-foreground">
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
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Average
            </p>
            <p className="mt-1 text-xl font-semibold tabular text-foreground">
              {result ? formatAvg(result.average) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border/80 p-3.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Position
            </p>
            <p className="mt-1 text-xl font-semibold tabular text-foreground">
              {result ? `${result.rank} of ${classSize}` : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border/80 p-3.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Attendance
            </p>
            <p className="mt-1 text-xl font-semibold tabular text-foreground">
              {attendance.present}/{attendance.total}{" "}
              <span className="text-sm font-normal text-muted-foreground">days</span>
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-border/80 bg-muted/40 p-4">
          <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
            Class teacher&apos;s remark
          </p>
          <p className="mt-1.5 text-compact leading-relaxed text-foreground">
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
  );
}
