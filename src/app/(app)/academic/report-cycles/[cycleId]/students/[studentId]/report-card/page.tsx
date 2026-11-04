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
  classNameOf,
  commentFor,
  defaultScheme,
  studentAttendance,
  studentById,
  studentEffort,
  studentResultOf,
  studentsInClass,
  subjectRemark,
  subjects,
  verificationRecords,
} from "@/lib/demo-data";
import { gradeFor } from "@/lib/grading";
import { fmtLongDate } from "@/lib/format";
import { Download, Printer } from "lucide-react";
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
  const verification = verificationRecords.find(
    (v) => v.studentId === student.id && v.cycleId === cycle.id,
  );

  const rows = subjects.map((sub) => {
    const mark = result?.marks[sub.id] ?? null;
    const grade = mark !== null ? gradeFor(mark, defaultScheme) : undefined;
    return { subject: sub, mark, grade };
  });
  const assessed = rows.filter((r) => r.mark !== null);
  const pointsTotal = assessed.reduce((a, r) => a + (r.grade?.points ?? 0), 0);

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
            {rows.map(({ subject, mark, grade }) => (
              <tr key={subject.id} className="border-b border-border">
                <td className="py-1.5 pr-2 font-medium">{subject.name}</td>
                <td className="py-1.5 pr-2 text-right tabular">{mark !== null ? mark : "-"}</td>
                <td className="py-1.5 pr-2 text-center font-semibold">{grade?.grade ?? "-"}</td>
                <td className="py-1.5 pr-2 text-center tabular">{grade ? grade.points : "-"}</td>
                <td className="py-1.5 pr-2 text-center">
                  {mark !== null ? studentEffort(student.id, subject.id) : "-"}
                </td>
                <td className="py-1.5 text-muted-foreground">
                  {mark !== null ? subjectRemark(mark) : "Not assessed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary strip */}
        <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-muted sm:grid-cols-5">
          {[
            { label: "Total marks", value: result ? String(result.total) : "-" },
            { label: "Average", value: result ? result.average.toFixed(1) : "-" },
            { label: "Overall grade", value: result && result.count > 0 ? result.grade : "-" },
            { label: "Points total", value: assessed.length > 0 ? String(pointsTotal) : "-" },
            { label: "Class size", value: String(classSize) },
          ].map((cell) => (
            <div key={cell.label} className="bg-white px-3 py-2 text-center">
              <p className={CARD_LABEL}>{cell.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular">{cell.value}</p>
            </div>
          ))}
        </div>

        {/* Remarks */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="border border-border p-3">
            <p className={CARD_LABEL}>Class teacher&apos;s remark</p>
            <p className="mt-1 text-compact leading-relaxed text-foreground/80">
              {comment.classTeacher ?? "Awaiting remark"}
            </p>
          </div>
          <div className="border border-border p-3">
            <p className={CARD_LABEL}>Head of School&apos;s remark</p>
            <p className="mt-1 text-compact leading-relaxed text-foreground/80">
              {comment.headTeacher ?? "Awaiting remark"}
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

        {/* Verification strip */}
        <div className="mt-8 flex flex-col gap-2 border border-input px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-foreground">
              {verification
                ? verification.code
                : `JS26-T1-${student.admissionNo.slice(-4)}-`}
            </p>
            {verification ? (
              <p className="mt-0.5 font-mono text-2xs text-muted-foreground">{verification.checksum}</p>
            ) : null}
          </div>
          <p className="text-2xs text-muted-foreground">
            {verification
              ? "Authenticate at josephian.ac.tz/verify"
              : "Verification code appears on issued copies"}
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
