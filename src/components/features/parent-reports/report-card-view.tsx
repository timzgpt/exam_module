"use client";

import { AttendanceSummaryCard } from "@/components/shared/attendance-summary";
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
  attendanceRecordFor,
  classById,
  classNameOf,
  classSubjectsFor,
  commentFor,
  currentCycle,
  getComponents,
  isPrimaryClass,
  schemeForClass,
  studentResultOf,
  subjectById,
  subjectComment,
  teacherById,
} from "@/lib/demo-data";
import { divisionFor, fmtTotalMark, formatAvg, gradeFor, subjectsPassed } from "@/lib/grading";
import { firstName } from "@/lib/format";
import type { Student } from "@/lib/types";
import { Download } from "lucide-react";

/**
 * Terminal and annual reports print without the "Teacher's remark" captions
 * (school rule): the remark text stands alone and the caption space is left
 * blank. Mid-term cards keep the captions.
 */
const REMARK_CAPTIONS_OFF = currentCycle.kind === "terminal" || currentCycle.kind === "annual";

/**
 * Subject comments print on Terminal and Annual cards only — the Mid-Term
 * and Monthly templates have no subject comments at all (school rule).
 * The portal renders the current cycle, so the remark column follows it.
 */
const SHOW_SUBJECT_REMARKS =
  currentCycle.kind === "terminal" || currentCycle.kind === "annual";

/**
 * Printable report card view of the parent hub, for one child. Rendered only
 * when the child's card is not on hold (held cards show the hold panel).
 *
 * Portal rules (knowledge base B1.10): never show internal bands, tiers or
 * class rankings — the class position is therefore NOT printed here, only on
 * the staff-side card.
 */
export function ReportCardView({ child }: { child: Student }) {
  const downloadPdf = usePrintDownload(
    "Use 'Save as PDF' in the print dialog to keep a copy of the card.",
  );

  const result = studentResultOf(child.id);
  const attendance = attendanceRecordFor(child.id);
  const comment = commentFor(child.classId, child.id);
  const classTeacher = teacherById(classById(child.classId)?.classTeacherId);
  const scheme = schemeForClass(child.classId);
  const isPrimary = isPrimaryClass(child.classId);
  // Class-subject order (set on the Class subjects page). A subject with no
  // mark at all is omitted entirely; non-enrolled subsidiaries stay with "—".
  const rows = classSubjectsFor(child.classId)
    .map((cs) => {
      const subject = subjectById(cs.subjectId)!;
      const comp = getComponents(child.classId, cs.subjectId)[child.id];
      const enrolled = comp?.enrolled ?? true;
      const mark = enrolled ? result?.marks[cs.subjectId] ?? null : null;
      const grade = mark !== null ? gradeFor(mark, scheme) : undefined;
      return {
        subject,
        enrolled,
        mark,
        grade,
        ca: comp?.ca ?? null,
        exam: comp?.exam ?? null,
      };
    })
    .filter((r) => !r.enrolled || r.mark !== null);
  const taken = rows.filter((r) => r.enrolled && r.grade).length;
  const passed = subjectsPassed(rows.map((r) => (r.enrolled ? r.grade?.grade ?? null : null)));
  // Division text for secondary classes; primary cards never carry a division.
  const division = isPrimary
    ? null
    : divisionFor(rows.map((r) => (r.enrolled ? r.grade?.points ?? null : null)));
  const overallGrade =
    result && result.count > 0 ? gradeFor(result.average, scheme)?.grade ?? null : null;

  return (
    <SectionCard>
      {/* Toolbar: screen only */}
      <div className="print:hidden mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-compact font-medium text-foreground">
            {currentCycle.name} · {firstName(child.name)}
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
          <img
            src="/josephian-logo.png"
            alt="Josephian Schools logo"
            className="mx-auto h-14 w-14"
          />
          <p
            className="mt-1 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "#5C0A14" }}
          >
            {SCHOOL.name.toUpperCase()}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            {currentCycle.term} {currentCycle.academicYear} Report Card
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
                {SHOW_SUBJECT_REMARKS ? (
                  <TableHead className="min-w-50" aria-label="Subject comment">
                    {""}
                  </TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ subject, enrolled, mark, grade, ca, exam }) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium text-foreground">{subject.name}</TableCell>
                  <TableCell className="text-right tabular">
                    {enrolled && mark !== null ? fmtTotalMark(mark) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    {enrolled && grade ? (
                      <GradePill grade={grade.grade} className="mx-auto" />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  {SHOW_SUBJECT_REMARKS ? (
                    <TableCell className="text-compact leading-relaxed text-muted-foreground">
                      {!enrolled
                        ? "Not taking this subject"
                        : mark !== null
                          ? subjectComment(child.id, subject.id, mark, scheme, {
                              ca,
                              exam,
                            })
                          : "Not assessed"}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary: no rankings on the portal (B1.10) — average, grade or
            division, and subjects passed only. */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/80 p-3.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Overall average
            </p>
            <p className="mt-1 text-xl font-semibold tabular text-foreground">
              {result ? formatAvg(result.average) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border/80 p-3.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Overall grade
            </p>
            <div className="mt-1 flex items-center gap-2">
              {overallGrade ? <GradePill grade={overallGrade} /> : <span className="text-xl font-semibold text-foreground">-</span>}
              {!isPrimary && division ? (
                <span className="text-compact font-medium text-foreground">
                  Division {division.division} · {division.label}
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-lg border border-border/80 p-3.5">
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subjects passed
            </p>
            <p className="mt-1 text-xl font-semibold tabular text-foreground">
              {result ? `${passed} of ${taken}` : "-"}
            </p>
          </div>
        </div>

        {/* Attendance (A3.8) with the Swahili register label. */}
        <AttendanceSummaryCard variant="screen" summary={attendance} className="mt-3" />

        <div className="mt-3 rounded-lg border border-border/80 bg-muted/40 p-4">
          {REMARK_CAPTIONS_OFF ? null : (
            <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Class teacher&apos;s remark
            </p>
          )}
          <p
            className={
              REMARK_CAPTIONS_OFF
                ? "text-compact leading-relaxed text-foreground"
                : "mt-1.5 text-compact leading-relaxed text-foreground"
            }
          >
            {comment.classTeacher ?? (REMARK_CAPTIONS_OFF ? "\u00A0" : "Awaiting remark")}
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
