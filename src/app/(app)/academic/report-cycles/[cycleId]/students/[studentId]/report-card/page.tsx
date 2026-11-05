"use client";

import { Fragment } from "react";
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
  buildChartSeries,
  CHART_FALLBACK_TEXT,
  classScoreFor,
  generateChartImage,
  type ChartVariant,
} from "@/lib/chart/performance-chart";
import { AttendanceSummaryCard } from "@/components/shared/attendance-summary";
import {
  attendanceRecordFor,
  classById,
  classSubjectsFor,
  classNameOf,
  commentFor,
  getComponents,
  isPrimaryClass,
  prevCaOf,
  schemeForClass,
  studentById,
  studentResultOf,
  studentsInClass,
  subjectById,
  subjectRemark,
  teacherById,
} from "@/lib/demo-data";
import {
  DIVISION_BANDS,
  divisionFor,
  fmtTotalMark,
  gradeFor,
  mostImprovedSubject,
  subjectsPassed,
} from "@/lib/grading";
import { fmtDateRange, fmtLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AlertTriangle, Download, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

const CARD_LABEL = "text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";

interface ChartRow {
  name: string;
  achieved: number;
  classAvg: number;
  classTop: number;
}

interface PerformanceChartSectionProps {
  /** Which report engine printed this card (mid-term vs terminal rules). */
  variant: ChartVariant;
  /** Static data-URI chart image; null renders the fallback paragraph. */
  chartImage: string | null;
  rows: ChartRow[];
  strongest: { name: string; score: number } | null;
  /** Mid-Term primary cards only (chart prompt §8). */
  bestImprovement: { name: string; value: number } | null;
  isPrimary: boolean;
}

/**
 * "Performance Charts" section (A4 section 6 / chart prompt §8): badge row,
 * the static grouped bar chart image, the Terminal HTML legend and a
 * visually hidden data table backing the chart for screen readers (B0:
 * charts include a table fallback).
 */
function PerformanceChartSection({
  variant,
  chartImage,
  rows,
  strongest,
  bestImprovement,
  isPrimary,
}: PerformanceChartSectionProps) {
  // Section heading: "Performance Chart" on secondary terminal cards only.
  const heading = variant === "mid-term" || isPrimary ? "Performance Charts" : "Performance Chart";
  return (
    <div className="mt-3 border border-border p-3">
      <p className={CARD_LABEL}>{heading}</p>
      {variant === "mid-term" ? (
        <div className="mt-0.5">
          <p className="text-compact font-medium">Subject Score Analysis</p>
          <p className="text-2xs text-muted-foreground">
            Student score vs class average across all subjects
          </p>
        </div>
      ) : null}
      {strongest || bestImprovement ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {strongest ? (
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-2xs font-medium text-primary">
              ★ Strongest Subject: {strongest.name} — {fmtTotalMark(strongest.score)} / 100
            </span>
          ) : null}
          {bestImprovement ? (
            <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-3 py-1 text-2xs font-medium text-success-strong">
              ▲ Best Improvement: {bestImprovement.name} — +{bestImprovement.value}
            </span>
          ) : null}
        </div>
      ) : null}
      {chartImage ? (
        <img
          src={chartImage}
          alt="Grouped bar chart comparing achieved marks with the class average and class topper for every assessed subject"
          className="chart-img mt-2 w-full"
        />
      ) : (
        <p className="mt-2 text-2xs text-muted-foreground">{CHART_FALLBACK_TEXT}</p>
      )}
      {variant === "terminal" ? (
        // Terminal legend is rendered in HTML, not in the chart image (§9).
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: "#E74C3C" }} /> Achieved Marks
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: "#3498DB" }} /> Class Avg
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-sm" style={{ background: "#2ECC71" }} /> Class Topper
          </span>
        </div>
      ) : null}
      {/* Chart data-table fallback (B0: charts include a table fallback). */}
      <table className="sr-only">
        <caption>Subject totals against the class average and class top</caption>
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col">Achieved</th>
            <th scope="col">Class average</th>
            <th scope="col">Class top</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{fmtTotalMark(row.achieved)}</td>
              <td>{fmtTotalMark(row.classAvg)}</td>
              <td>{fmtTotalMark(row.classTop)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportCardPage() {
  const params = useParams<{ studentId?: string }>();
  const router = useRouter();
  const { cycle } = useCycleContext();
  const student = studentById(params.studentId ?? "") ?? studentById(DEMO_IDS.studentId)!;

  const result = studentResultOf(student.id);
  const classmates = studentsInClass(student.classId);
  const classSize = classmates.length;
  const attendance = attendanceRecordFor(student.id);
  const comment = commentFor(student.classId, student.id);
  const classTeacherName =
    teacherById(classById(student.classId)?.classTeacherId)?.name ?? "\u2014";

  const classSubjects = classSubjectsFor(student.classId);
  const scheme = schemeForClass(student.classId);
  const isPrimary = isPrimaryClass(student.classId);
  // Assessment split shown in the table header (25 % monthly / 75 % terminal).
  const caPct = classSubjects[0]?.caMarks ?? 25;
  const examPct = classSubjects[0]?.examMarks ?? 75;
  // Top band of the class scheme — rendered as the filled grade badge.
  const topGrade = scheme.boundaries[0]?.grade;
  const allRows = classSubjects.map((cs) => {
    const subject = subjectById(cs.subjectId)!;
    const comp = getComponents(student.classId, cs.subjectId)[student.id];
    const enrolled = comp?.enrolled ?? true;
    const mark = enrolled ? result?.marks[cs.subjectId] ?? null : null;
    const grade = mark !== null ? gradeFor(mark, scheme) : undefined;
    return { subject, enrolled, mark, grade, ca: comp?.ca ?? null, exam: comp?.exam ?? null };
  });
  // A subject with no mark at all (both components ABS/NA/NR/PENDING) is
  // omitted from the card entirely; non-enrolled subsidiaries stay with "—".
  // Remaining rows renumber continuously after any omitted subject (the #
  // column below).
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
  // Points and division are hidden on primary cards (Primary A–E bands carry
  // no points) and on any secondary class whose teacher set the Report
  // Overview "No Division" flag to Yes.
  const noDivision = !isPrimary && (classById(student.classId)?.noDivision ?? false);
  const showPoints = !isPrimary && !noDivision;
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

  // Chart data (A4 section 6 / chart prompt §3–§4): achieved total vs class
  // average and class top per assessed subject, over the student's enrolled
  // classmates. Class stats follow the cycle's engine: mid-term counts a
  // student with a single assessment at 100%; terminal only counts students
  // with BOTH components (chart prompt §4/§9).
  const variant: ChartVariant = cycle.kind === "mid-term" ? "mid-term" : "terminal";
  const chartRows: ChartRow[] = assessed.map((r) => {
    const cs = classSubjects.find((c) => c.subjectId === r.subject.id);
    const comps = getComponents(student.classId, r.subject.id);
    const scores = Object.values(comps)
      .filter((c) => c.enrolled)
      .map((c) => classScoreFor(variant, c.ca, c.exam, cs?.caMarks ?? 25, cs?.examMarks ?? 75))
      .filter((t): t is number => t !== null);
    return {
      name: r.subject.name,
      achieved: r.mark ?? 0,
      classAvg: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
      classTop: scores.length ? Math.max(...scores) : 0,
    };
  });
  // Series + static chart image (chart prompt §7 call sequence).
  const chartSeries = buildChartSeries(
    chartRows.map((r) => ({ name: r.name, achieved: r.achieved })),
    chartRows.map((r) => r.classAvg),
    chartRows.map((r) => r.classTop),
    strongest?.subject.name ?? "",
    variant,
  );
  const chartImage = generateChartImage(chartSeries, variant);
  // Best-Improvement badge: Mid-Term primary cards only (chart prompt §8).
  const chartBestImprovement =
    variant === "mid-term" && mostImproved && mostImprovedSubjectRow
      ? { name: mostImprovedSubjectRow.subject.name, value: mostImproved.delta }
      : null;

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

      {/* Legacy rule 7: a student with no marks at all renders an empty
          subject table — warn before printing instead of generating. */}
      {assessed.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/8 px-3 py-2 text-compact text-destructive print:hidden">
          <AlertTriangle className="size-4 shrink-0" />
          No marks have been entered for this student yet — report cards are generated only after marks exist.
        </div>
      ) : null}

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
          Student Report Card
        </h2>
        <p className="mt-0.5 text-center text-xs text-muted-foreground">
          {cycle.term} · {cycle.academicYear} Academic Year
        </p>
        {/* Report date + school opens badges (A4 header; never hard-coded). */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded border border-border px-2.5 py-1 text-2xs">
            <span className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">Report date</span>{" "}
            <span className="font-medium tabular">{fmtLongDate(cycle.reportDate)}</span>
          </span>
          <span className="rounded border border-border px-2.5 py-1 text-2xs">
            <span className="font-semibold uppercase tracking-[0.12em] text-muted-foreground">School opens</span>{" "}
            <span className="font-medium tabular">{fmtLongDate(cycle.schoolOpensDate)}</span>
          </span>
        </div>

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
            <p className={CARD_LABEL}>Class Teacher</p>
            <p className="mt-0.5 font-medium">{classTeacherName}</p>
          </div>
          <div>
            <p className={CARD_LABEL}>Academic Year</p>
            <p className="mt-0.5 font-medium tabular">{cycle.academicYear}</p>
          </div>
          <div>
            <p className={CARD_LABEL}>Position</p>
            <p className="mt-0.5 font-medium tabular">
              {result ? `${result.rank} of ${classSize}` : "-"}
            </p>
          </div>
          <div>
            <p className={CARD_LABEL}>Cycle</p>
            <p className="mt-0.5 font-medium">{cycle.name}</p>
          </div>
        </div>

        {/* Subjects table — the school's maroon ledger design: monthly and
            terminal components with their assessment weights, weighted total,
            grade badge and exam-vs-CA progress, with the subject teacher's
            remark quoted beneath each subject row. */}
        <div className="mt-6 overflow-hidden rounded-lg bg-[#F7F2E9] font-sans">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[5%]" />
              <col className="w-[29%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[16.5%]" />
              <col className="w-[11.5%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="bg-gradient-to-r from-[#5B1117] to-[#3D0B10] text-white">
                <th className="py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em]">
                  #
                </th>
                <th className="py-3 pl-6 text-left text-[11px] font-bold uppercase tracking-[0.14em]">
                  Subject
                </th>
                <th className="border-l border-white/10 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em]">
                  Monthly
                  <span className="block text-[10px] font-semibold tracking-[0.08em] text-white/70">
                    {caPct} %
                  </span>
                </th>
                <th className="border-l border-white/10 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em]">
                  Terminal
                  <span className="block text-[10px] font-semibold tracking-[0.08em] text-white/70">
                    {examPct} %
                  </span>
                </th>
                <th className="border-l border-white/10 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em]">
                  Total
                </th>
                <th className="border-l border-white/10 py-3 text-center text-[11px] font-bold uppercase tracking-[0.14em]">
                  Grade
                </th>
                <th className="border-l border-white/10 py-3 pr-2 text-center text-[11px] font-bold uppercase tracking-[0.14em]">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const { subject, enrolled, mark, grade, ca, exam } = row;
                // Progress = terminal − monthly, shown only when both
                // components exist (single-assessment subjects carry their
                // mark at 100 % and have no progress to report).
                const delta = ca !== null && exam !== null ? exam - ca : null;
                return (
                  <Fragment key={subject.id}>
                    <tr>
                      <td className="bg-[#F3ECDD] pb-2 pl-0.5 pr-0.5 pt-2 text-center align-top text-2xs tabular text-[#9D8E7D]">
                        {rowIndex + 1}
                      </td>
                      <td className="bg-[#F3ECDD] px-5 py-4">
                        <p className="text-[15px] font-semibold leading-tight text-[#5C1217]">
                          {subject.name}
                        </p>
                        {mark !== null ? (
                          <div className="mt-2 h-1.5 w-[210px] max-w-full overflow-hidden rounded-full bg-[#ECE3D1]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, mark))}%`,
                                background: "linear-gradient(90deg, #5E1519, #C8A64C)",
                              }}
                            />
                          </div>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "bg-[#F3ECDD] text-center text-[15px] tabular text-[#3B291A]",
                          ca === null && "text-[#9D8E7D]",
                        )}
                      >
                        {ca ?? "—"}
                      </td>
                      <td
                        className={cn(
                          "bg-[#F3ECDD] text-center text-[15px] tabular text-[#3B291A]",
                          exam === null && "text-[#9D8E7D]",
                        )}
                      >
                        {exam ?? "—"}
                      </td>
                      <td className="bg-[#F3ECDD] text-center text-[15px] font-bold tabular text-[#1B0F08]">
                        {enrolled && mark !== null ? mark.toFixed(2) : "—"}
                      </td>
                      <td className="bg-[#F3ECDD] text-center">
                        {enrolled && grade?.grade ? (
                          <span
                            className={cn(
                              "inline-flex size-8 items-center justify-center rounded-full text-sm font-bold",
                              grade.grade === topGrade
                                ? "bg-[#5C1217] text-[#DFC775]"
                                : "border border-[#5C1217]/30 bg-[#ECE3D1] text-[#5C1217]",
                            )}
                          >
                            {grade.grade}
                          </span>
                        ) : (
                          <span className="text-[15px] text-[#9D8E7D]">—</span>
                        )}
                      </td>
                      <td className="bg-[#F3ECDD] pr-2 text-center">
                        {delta !== null ? (
                          <span
                            className={cn(
                              "text-[15px] font-bold tabular",
                              delta > 0
                                ? "text-[#2D6A4E]"
                                : delta < 0
                                  ? "text-[#C0392B]"
                                  : "text-[#9D8E7D]",
                            )}
                          >
                            {delta > 0 ? "+" : delta < 0 ? "-" : ""}
                            {Math.abs(delta).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[15px] text-[#9D8E7D]">—</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="mx-4 my-2.5 flex items-start gap-2.5 border-l-4 border-[#C8A74B] bg-[#F2EAD9] py-3 pl-4 pr-5">
                          <span
                            aria-hidden
                            className="font-serif text-[22px] leading-none text-[#C0A66E]"
                          >
                            “
                          </span>
                          <p className="text-compact italic leading-relaxed text-[#3B291A]">
                            {!enrolled
                              ? "Not taking this subject."
                              : mark !== null
                                ? subjectRemark(mark, scheme)
                                : "Not assessed."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {assessed.length > 0 ? (
          <PerformanceChartSection
            variant={variant}
            chartImage={chartImage}
            rows={chartRows}
            strongest={strongest ? { name: strongest.subject.name, score: strongest.mark as number } : null}
            bestImprovement={chartBestImprovement}
            isPrimary={isPrimary}
          />
        ) : null}
        {/* The Best-Improvement badge carries the improvement info on
            mid-term primary cards; the explainer line covers the rest. */}
        {mostImproved && mostImprovedSubjectRow && !chartBestImprovement ? (
          <p className="mt-1 text-2xs text-muted-foreground">
            Most improved: <span className="font-medium text-foreground">{mostImprovedSubjectRow.subject.name}</span> · CA up{" "}
            {mostImproved.delta} marks from last term (largest C2 − C1 gain; a subject with a single recorded term
            counts as 0)
          </p>
        ) : null}
        <p className="mt-1.5 text-2xs text-muted-foreground">
          A subject with only one assessment sat carries that mark at 100%; a subject with no marks at all is omitted
          and the remaining rows renumber continuously.
        </p>

        {/* Summary strip */}
        <div className="mt-4 grid grid-cols-2 gap-px border border-border bg-muted sm:grid-cols-4">
          {[
            { label: "Total marks", value: result ? fmtTotalMark(result.total) : "-" },
            { label: "Average", value: result ? result.average.toFixed(1) : "-" },
            { label: "Overall grade", value: result && result.count > 0 ? result.grade : "-" },
            ...(showPoints
              ? [{ label: "Points total", value: assessed.length > 0 ? String(pointsTotal) : "-" }]
              : []),
            { label: "Subjects passed", value: assessed.length > 0 ? `${passed} of ${assessed.length}` : "-" },
            ...(showPoints
              ? [{ label: "Division", value: division ? `Div ${division.division}` : "—" }]
              : []),
            { label: "Class size", value: String(classSize) },
          ].map((cell) => (
            <div key={cell.label} className="bg-white px-3 py-2 text-center">
              <p className={CARD_LABEL}>{cell.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular">{cell.value}</p>
            </div>
          ))}
        </div>

        {/* Attendance (A3.8): after the performance summary, before the scales. */}
        <AttendanceSummaryCard variant="print" summary={attendance} className="mt-4" />

        {/* Grade scale chips (A4 section 7) — rendered from the class scheme. */}
        <div className="mt-4">
          <p className={CARD_LABEL}>Grade scale</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {scheme.boundaries.map((b) => (
              <span
                key={b.grade}
                className="rounded border border-border px-2 py-1 text-2xs text-muted-foreground"
              >
                <span className="font-bold text-foreground">{b.grade}</span> {b.min}–{b.max} · {b.remark}
                {showPoints ? ` · ${b.points} pt${b.points === 1 ? "" : "s"}` : ""}
              </span>
            ))}
          </div>
        </div>

        {/* Division scale chips + gap text (A4 section 8); C6 wording when
            the student has fewer than 7 graded subjects. */}
        {showPoints ? (
          <div className="mt-3">
            <p className={CARD_LABEL}>Division scale</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {DIVISION_BANDS.map((b) => {
                const achieved = division?.division === b.division;
                return (
                  <span
                    key={b.division}
                    className={cn(
                      "rounded border px-2 py-1 text-2xs",
                      achieved
                        ? "border-primary bg-primary font-semibold text-primary-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    Div {b.division} · {b.min}–{b.max} · {b.label}
                    {achieved && division ? ` \u25B2 ${division.pointsSum} pts` : ""}
                  </span>
                );
              })}
            </div>
            <p className="mt-1.5 text-2xs text-muted-foreground">
              {division
                ? division.gapToDivisionI <= 0
                  ? "Highest division achieved — computed from the best 7 graded subject points."
                  : `${division.gapToDivisionI} point${division.gapToDivisionI === 1 ? "" : "s"} from Division I — computed from the best 7 graded subject points.`
                : "Division: not computed (fewer than 7 graded subjects)."}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-center text-2xs text-muted-foreground">
            {isPrimary
              ? "Primary cards show no points and no division — performance is reported with the Primary A–E bands and the most-improved subject."
              : "No division printed — the class teacher set “No Division” to Yes in the report overview for this class."}
          </p>
        )}

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
        {/* Three signature slots (A4 section 10): Class Teacher · Academic
            Dean · Principal. A real sign-off adds images and timestamps. */}
        <div className="mt-10 grid grid-cols-2 gap-8 text-center text-compact sm:grid-cols-3">
          <div>
            <div className="mx-auto w-40 border-t border-foreground/30" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Class Teacher
            </p>
          </div>
          <div>
            <div className="mx-auto w-40 border-t border-foreground/30" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Academic Dean
            </p>
          </div>
          <div>
            <div className="mx-auto w-40 border-t border-foreground/30" />
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Principal
            </p>
          </div>
        </div>

        {/* Footer seal — diamond is the escaped \u25C6 (legacy bug 4: the
            literal character printed as "?" on old cards). */}
        <p className="mt-6 text-center text-2xs text-muted-foreground">
          {"\u25C6"} {SCHOOL.name} · {SCHOOL.address} {"\u25C6"}
        </p>
      </div>
      </div>
    </div>
  );
}
