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
import { useToast } from "@/hooks/use-toast";
import { DEMO_IDS, SCHOOL } from "@/lib/demo-config";
import {
  classNameOf,
  commentFor,
  cycleById,
  currentCycle,
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
import { Download, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-03-27" -> "27 March 2026" */
function fmtLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

const CARD_LABEL = "text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500";

export default function ReportCardPage() {
  const params = useParams<{ cycleId?: string; studentId?: string }>();
  const router = useRouter();
  const { toast } = useToast();

  // Param resolution — never crash on unknown ids.
  const cycle = cycleById(params.cycleId ?? "") ?? currentCycle;
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

  const downloadPdf = () => {
    toast({
      title: "Opening print dialog",
      description: "Use 'Save as PDF' in the print dialog to download the report card.",
    });
    window.print();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report card"
        description={`${student.name} · ${classNameOf(student.classId)} · ${cycle.name}`}
      />

      {/* Toolbar — screen only, never printed */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Student</span>
          <Select value={student.id} onValueChange={switchStudent}>
            <SelectTrigger className="h-8 w-full text-[13px] sm:w-[260px]">
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

      {/* The printable card */}
      <div
        className="print-area mx-auto max-w-[820px] border border-border bg-white p-8 text-neutral-900 shadow-sm"
        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
      >
        {/* School header */}
        <p className="text-center text-xs font-semibold uppercase tracking-[0.35em]">
          {SCHOOL.name}
        </p>
        <p className="mt-1 text-center text-xs italic text-neutral-500">{SCHOOL.motto}</p>
        <p className="mt-1 text-center text-[11px] text-neutral-500">
          {SCHOOL.address} · {SCHOOL.phone}
        </p>
        <div className="mx-auto mt-3 h-[5px] max-w-md border-y border-neutral-400" />

        <h2 className="mt-5 text-center text-base font-bold uppercase tracking-[0.18em]">
          Student Terminal Report
        </h2>
        <p className="mt-0.5 text-center text-xs text-neutral-500">
          {cycle.term} · {cycle.academicYear} Academic Year
        </p>

        {/* Student info grid */}
        <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-3">
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
              {result ? `${result.rank} of ${classSize}` : "—"}
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
        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-neutral-400 text-left">
              <th className="py-1.5 pr-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Subject
              </th>
              <th className="py-1.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Mark
              </th>
              <th className="py-1.5 pr-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Grade
              </th>
              <th className="py-1.5 pr-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Points
              </th>
              <th className="py-1.5 pr-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Effort
              </th>
              <th className="py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
                Teacher&apos;s Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ subject, mark, grade }) => (
              <tr key={subject.id} className="border-b border-neutral-200">
                <td className="py-1.5 pr-2 font-medium">{subject.name}</td>
                <td className="py-1.5 pr-2 text-right tabular">{mark !== null ? mark : "—"}</td>
                <td className="py-1.5 pr-2 text-center font-semibold">{grade?.grade ?? "—"}</td>
                <td className="py-1.5 pr-2 text-center tabular">{grade ? grade.points : "—"}</td>
                <td className="py-1.5 pr-2 text-center">
                  {mark !== null ? studentEffort(student.id, subject.id) : "—"}
                </td>
                <td className="py-1.5 text-neutral-600">
                  {mark !== null ? subjectRemark(mark) : "Not assessed"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary strip */}
        <div className="mt-4 grid grid-cols-2 gap-px border border-neutral-300 bg-neutral-300 sm:grid-cols-5">
          {[
            { label: "Total marks", value: result ? String(result.total) : "—" },
            { label: "Average", value: result ? result.average.toFixed(1) : "—" },
            { label: "Overall grade", value: result && result.count > 0 ? result.grade : "—" },
            { label: "Points total", value: assessed.length > 0 ? String(pointsTotal) : "—" },
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
          <div className="border border-neutral-300 p-3">
            <p className={CARD_LABEL}>Class teacher&apos;s remark</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
              {comment.classTeacher ?? "Awaiting remark"}
            </p>
          </div>
          <div className="border border-neutral-300 p-3">
            <p className={CARD_LABEL}>Head of School&apos;s remark</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-700">
              {comment.headTeacher ?? "Awaiting remark"}
            </p>
          </div>
        </div>

        {/* Footer — parents' day + signatures */}
        <p className="mt-6 text-center text-xs text-neutral-500">
          Parents&apos; consultation day: {fmtLongDate(cycle.parentsDayDate)}
        </p>
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-[13px]">
          <div>
            <div className="mx-auto w-48 border-t border-neutral-500" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
              Class Teacher
            </p>
          </div>
          <div>
            <div className="mx-auto w-48 border-t border-neutral-500" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
              Head of School
            </p>
          </div>
        </div>

        {/* Verification strip */}
        <div className="mt-8 flex flex-col gap-2 border border-neutral-400 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-neutral-900">
              {verification
                ? verification.code
                : `JS26-T1-${student.admissionNo.slice(-4)}-—`}
            </p>
            {verification ? (
              <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{verification.checksum}</p>
            ) : null}
          </div>
          <p className="text-[11px] text-neutral-500">
            {verification
              ? "Authenticate at josephian.ac.tz/verify"
              : "Verification code appears on issued copies"}
          </p>
        </div>
      </div>
    </div>
  );
}
