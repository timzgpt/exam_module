"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePrintDownload } from "@/hooks/use-print-download";
import { useCycleContext } from "@/hooks/use-academic-context";
import { DEMO_IDS, SCHOOL } from "@/lib/demo-config";
import {
  classSubjectsFor,
  classNameOf,
  commentFor,
  getComponents,
  isPrimaryClass,
  prevCaOf,
  schemeForClass,
  studentAttendance,
  studentById,
  studentEffort,
  studentResultOf,
  studentsInClass,
  subjectById,
  subjectRemark,
} from "@/lib/demo-data";
import { divisionFor, fmtTotalMark, gradeFor, mostImprovedSubject, subjectsPassed } from "@/lib/grading";
import { fmtLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Download, Printer, TrendingUp } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const CARD_LABEL = "text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export default function ReportCardPage() {
  const params = useParams<{ studentId?: string }>();
  const router = useRouter();
  const { cycle } = useCycleContext();
  const student = studentById(params.studentId ?? "") ?? studentById(DEMO_IDS.studentId)!;

  const result = studentResultOf(student.id);
  const classmates = studentsInClass(student.classId);
  const classSize = classmates.length;
  const attendance = studentAttendance(student.id);
  const comment = commentFor(student.classId, student.id);

  const classSubjects = classSubjectsFor(student.classId);
  const scheme = schemeForClass(student.classId);
  const isPrimary = isPrimaryClass(student.classId);
  const allRows = classSubjects.map((cs) => {
    const subject = subjectById(cs.subjectId)!;
    const comp = getComponents(student.classId, cs.subjectId)[student.id];
    const enrolled = comp?.enrolled ?? true;
    const mark = enrolled ? result?.marks[cs.subjectId] ?? null : null;
    const grade = mark !== null ? gradeFor(mark, scheme) : undefined;
    return { subject, enrolled, mark, grade };
  });
  // A subject with no mark at all (both components ABS/NA/NR/PENDING) is
  // omitted from the card entirely; non-enrolled subsidiaries stay with "—".
  const rows = allRows.filter((r) => !r.enrolled || r.mark !== null);
  const assessed = allRows.filter((r) => r.mark !== null);
  const pointsTotal = assessed.reduce((a, r) => a + (r.grade?.points ?? 0), 0);
  // Secondary division: best 7 subject points; null when fewer than 7 graded
  // (and always null for primary classes — divisions are a NECTA outcome).
  const division = isPrimary ? null : divisionFor(assessed.map((r) => r.grade?.points ?? null));
  const passed = subjectsPassed(assessed.map((r) => r.grade?.grade ?? null));
  // Strongest subject: highest total; ties go to the first in subject order.
  const strongest =
    assessed.length > 0
      ? assessed.reduce((best, r) => ((r.mark as number) > (best.mark as number) ? r : best))
      : undefined;
  // Most improved (primary only): largest CA delta C2 − C1 per subject; a
  // single recorded term counts as 0. Ties go to the first subject in order.
  const mostImproved = (() => {
    if (!isPrimary) return null;
    const deltas = classSubjects.map((cs) => {
      const comp = getComponents(student.classId, cs.subjectId)[student.id];
      const cur = comp?.enrolled ? comp.ca ?? null : null;
      const prev = prevCaOf(student.classId, cs.subjectId)[student.id] ?? null;
      return { subjectId: cs.subjectId, delta: cur !== null && prev !== null ? cur - prev : 0 };
    });
    const best = mostImprovedSubject(deltas);
    return best && best.delta > 0 ? best : null;
  })();
  const mostImprovedSubjectRow = mostImproved
    ? rows.find((r) => r.subject.id === mostImproved.subjectId)
    : undefined;

  const switchStudent = (id: string) => {
    router.push(`/academic/report-cycles/${cycle.id}/students/${id}/report-card`);
  };

  const downloadPdf = usePrintDownload(
    "Use 'Save as PDF' in the print dialog to download the report card.",
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report card"
        description={`${student.name} · ${classNameOf(student.classId)} · ${cycle.name}`}
      />

      {/* Toolbar: screen only, never printed */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Student</span>
          {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
          <Select value={student.id} onValueChange={switchStudent}>
            <SelectTrigger className="h-8 w-full text-compact sm:w-65">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classmates.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="gap-1.5" onClick={downloadPdf}>
            <Download className="size-4" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
      </div>

      {/* The printable card: scrollable on a phone, exact A4 sheet in print */}
      <div className="overflow-x-auto print:overflow-visible">
        <div
          className="print-area mx-auto w-full max-w-205 border border-border bg-white p-8 font-serif text-foreground shadow-sm"
        >
        {/* School header */}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em]">
          {SCHOOL.name}
        </p>
        <p className="mt-1 text-center text-xs italic text-muted-foreground">{SCHOOL.motto}</p>
        <p className="mt-1 text-center text-2xs text-muted-foreground">
          {SCHOOL.address} · {SCHOOL.phone}
        </p>
        <div className="mx-auto mt-3 h-1 max-w-md border-y border-input" />

        <h2 className="mt-5 text-center text-base font-bold uppercase tracking-[0.18em]">
          Student Terminal Report
        </h2>
        <p className="mt-0.5 text-center text-xs text-muted-foreground">
          {cycle.term} · {cycle.academicYear} Academic Year
        </p>

        {/* Student info grid */}
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-compact sm:grid-cols-3">
          <div>
            <p className={CARD_LABEL}>Name</p>
            <p className="mt-0.5 font-medium">{student.name}</p>
          </div>
          <div>
            <p className={CARD_LABEL}>Admission No</p>
            <p className="mt-0.5 font-medium tabular">{student.admissionNo}</p>
          </div>
          <div>
            <p className={CARD_LABEL}>Class</p>
            <p className="mt-0.5 font-medium">{classNameOf(student.classId)}</p>
          </div>
          <div>
            <p className={CARD_LABEL}>Position</p>
            <p className="mt-0.5 font-medium tabular">
              {result ? `${result.rank} of ${classSize}` : "-"}
            </p>
          </div>
          <div>
            <p className={CARD_LABEL}>Attendance</p>
            <p className="mt-0.5 font-medium tabular">
              {attendance.present} / {attendance.total} days
            </p>
          </div>
          <div>
            <p className={CARD_LABEL}>Cycle</p>
            <p className="mt-0.5 font-medium">{cycle.name}</p>
          </div>
        </div>

        {/* Subjects table */}
        <table className="mt-6 w-full table-fixed border-collapse text-compact">
          <thead>
            <tr className="border-y border-input text-left">
              <th className="py-1.5 pr-2 text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Subject
              </th>
              <th className="py-1.5 pr-2 text-right text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Mark
              </th>
              <th className="py-1.5 pr-2 text-center text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Grade
              </th>
              <th className="py-1.5 pr-2 text-center text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Points
              </th>
              <th className="py-1.5 pr-2 text-center text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Effort
              </th>
              <th className="py-1.5 text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Teacher&apos;s Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ subject, enrolled, mark, grade }) => {
              const improved = mostImproved?.subjectId === subject.id;
              return (
                <tr
                  key={subject.id}
                  className={cn("border-b border-border", improved && "bg-success/8")}
                >
                  <td className="py-1.5 pr-2 font-medium">
                    {subject.name}
                    {improved ? (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-success/15 px-1.5 py-0.5 align-middle text-2xs font-semibold text-success-strong">
                        <TrendingUp className="size-2.5" /> Most improved +{mostImproved?.delta}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular">
                    {enrolled && mark !== null ? fmtTotalMark(mark) : "—"}
                  </td>
                  <td className="py-1.5 pr-2 text-center font-semibold">
                    {enrolled && grade?.grade ? grade.grade : "—"}
                  </td>
                  <td className="py-1.5 pr-2 text-center tabular">
                    {enrolled && grade ? grade.points : "—"}
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    {enrolled && mark !== null ? studentEffort(student.id, subject.id) : "—"}
                  </td>
                  <td className="py-1.5 text-muted-foreground">
                    {!enrolled ? "Not taking this subject" : mark !== null ? subjectRemark(mark, scheme) : "Not assessed"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {strongest ? (
          <p className="mt-2 text-2xs text-muted-foreground">
            Strongest subject: <span className="font-medium text-foreground">{strongest.subject.name}</span> ·{" "}
            {fmtTotalMark(strongest.mark as number)} (ties go to the first subject in report-card order)
          </p>
        ) : null}
        {mostImproved && mostImprovedSubjectRow ? (
          <p className="mt-1 text-2xs text-muted-foreground">
            Most improved: <span className="font-medium text-foreground">{mostImprovedSubjectRow.subject.name}</span> · CA up{" "}
            {mostImproved.delta} marks from last term (largest C2 − C1 gain; a subject with a single recorded term
            counts as 0)
          </p>
        ) : null}

        {/* Summary strip */}
        <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-muted sm:grid-cols-4">
          {[
            { label: "Total marks", value: result ? fmtTotalMark(result.total) : "-" },
            { label: "Average", value: result ? result.average.toFixed(1) : "-" },
            { label: "Overall grade", value: result && result.count > 0 ? result.grade : "-" },
            { label: "Points total", value: assessed.length > 0 ? String(pointsTotal) : "-" },
            { label: "Subjects passed", value: assessed.length > 0 ? `${passed} of ${assessed.length}` : "-" },
            { label: "Division", value: division ? `Div ${division.division}` : "—" },
            { label: "Class size", value: String(classSize) },
          ].map((cell) => (
            <div key={cell.label} className="bg-white px-3 py-2 text-center">
              <p className={CARD_LABEL}>{cell.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular">{cell.value}</p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-center text-2xs text-muted-foreground">
          {isPrimary
            ? "Divisions are not computed for primary classes — performance is reported with the Primary A–E bands and the most-improved subject."
            : division
              ? `Division ${division.division} — ${division.label} · ${division.pointsSum} points from the best 7 graded subjects · ${
                  division.gapToDivisionI <= 0
                    ? "Highest division achieved"
                    : `${division.gapToDivisionI} point${division.gapToDivisionI === 1 ? "" : "s"} from Division I`
                }`
              : "No division printed — fewer than 7 graded subjects (pending Deo confirmation before release)."}
        </p>

        {/* Remarks */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-border p-3">
            <p className={CARD_LABEL}>Class teacher&apos;s remark</p>
            <p className="mt-1 text-compact leading-relaxed text-foreground/80">
              {comment.classTeacher ?? "Awaiting remark"}
            </p>
          </div>
          <div className="border border-border p-3">
            <p className={CARD_LABEL}>Parental involvement</p>
            <p className="mt-1 text-compact leading-relaxed text-foreground/80">
              {comment.parentalInvolvement ?? "Awaiting input"}
            </p>
          </div>
        </div>

        {/* Footer: parents' day + signatures */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Parents&apos; consultation day: {fmtLongDate(cycle.parentsDayDate)}
        </p>
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-compact">
          <div>
            <div className="mx-auto w-48 border-t border-foreground/30" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Class Teacher
            </p>
          </div>
          <div>
            <div className="mx-auto w-48 border-t border-foreground/30" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Head of School
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
