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
import {
  attendanceRecordFor,
  classById,
  classes,
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
import { ATTENDANCE_RATING_TEXT } from "@/lib/attendance";
import { fmtDateRange, fmtLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/store";
import { AlertTriangle, Download, Printer } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

/**
 * The card is printed as pure white paper laid out entirely with bordered
 * tables (the school's requested "totally white, only table" design). The
 * single accent colour is the brand maroon #5C0A14 — the exact maroon of
 * the Josephian Schools shield — used for the title band and every table
 * header row; all other fills are white.
 */
const BRAND = "#5C0A14";

/* Shared chrome for the card's tables. */
const TBL = "w-full table-fixed border-collapse";
/** Full-width maroon section bar (first row of each section table). */
const SECTION_BAR =
  "border border-border bg-[#5C0A14] px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-white";
/** Maroon column-heading cell. */
const COL_HEAD =
  "border border-border bg-[#5C0A14] px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white";
/** Standard bordered body cell (white). */
const CELL = "border border-border bg-white px-2 py-1.5 align-middle";
/** Tiny uppercase label used inside bordered cells. */
const CELL_LABEL =
  "text-3xs font-semibold uppercase tracking-[0.12em] text-muted-foreground";

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
 * "Performance Charts" section (A4 section 6 / chart prompt §8) — also laid
 * out as a table: a maroon section bar and a single bordered body cell
 * holding the badge lines, the static grouped bar chart image, the Terminal
 * HTML legend and a visually hidden data table backing the chart for screen
 * readers (B0: charts include a table fallback).
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
    <table className={cn(TBL, "mt-4")}>
      <tbody>
        <tr>
          <th scope="colgroup" className={SECTION_BAR}>
            {heading}
          </th>
        </tr>
        <tr>
          <td className={CELL}>
            {strongest || bestImprovement ? (
              <div className="mb-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-2xs font-semibold">
                {strongest ? (
                  <span style={{ color: BRAND }}>
                    ★ Strongest Subject: {strongest.name} — {fmtTotalMark(strongest.score)} / 100
                  </span>
                ) : null}
                {bestImprovement ? (
                  <span className="text-[#2D6A4E]">
                    ▲ Best Improvement: {bestImprovement.name} — +{bestImprovement.value}
                  </span>
                ) : null}
              </div>
            ) : null}
            {chartImage ? (
              <img
                src={chartImage}
                alt="Grouped bar chart comparing achieved marks with the class average and class topper for every assessed subject"
                className="chart-img w-full"
              />
            ) : (
              <p className="text-2xs text-muted-foreground">{CHART_FALLBACK_TEXT}</p>
            )}
            {variant === "terminal" ? (
              // Terminal legend is rendered in HTML, not in the chart image (§9).
              <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-2xs text-muted-foreground">
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
          </td>
        </tr>
      </tbody>
    </table>
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
  // ── Two report card templates ────────────────────────────────────────
  // The student's school level selects the template, so choosing a class
  // in the toolbar or the header switches between them:
  //   • PRIMARY (Grades 1–7) — A–E bands, no points, no division.
  //   • SECONDARY (Forms 1–4) — NECTA CSEE A–F bands, best-7 points,
  //     Division and the Division Scale strip.
  // `showPoints` below gates every secondary-only section; primary cards
  // simply never render points or division anywhere.
  const isPrimary = isPrimaryClass(student.classId);
  // Assessment split shown in the table header (25 % monthly / 75 % terminal).
  const caPct = classSubjects[0]?.caMarks ?? 25;
  const examPct = classSubjects[0]?.examMarks ?? 75;
  // COMBINED cycles (two exam components, e.g. Monthly + Mid-Term) label the
  // two mark columns after their own exams and weights; plain cycles keep
  // the classic Monthly / Terminal captions.
  const combined =
    cycle.components && cycle.components.length === 2 ? cycle.components : null;
  const firstCol = { label: combined?.[0].label ?? "Monthly", pct: combined?.[0].weight ?? caPct };
  const secondCol = { label: combined?.[1].label ?? "Terminal", pct: combined?.[1].weight ?? examPct };
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
  // Monthly Test and Mid-Term cycles run the mid-term chart engine (a
  // single assessment carries at 100%); terminal and annual run terminal.
  const variant: ChartVariant =
    cycle.kind === "terminal" || cycle.kind === "annual" ? "terminal" : "mid-term";
  // Terminal and annual cards carry the subject teacher's remark as a
  // full-width row beneath each subject, with no caption (school rule):
  // Mid-Term and Monthly templates have NO subject comments at all.
  const isTerminalLike = cycle.kind === "terminal" || cycle.kind === "annual";
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
    setStoreStudent(id);
    router.push(`/academic/report-cycles/${cycle.id}/students/${id}/report-card`);
  };

  // Class switch on the card itself: opens the class's first student, so
  // the primary/secondary template follows the selected class.
  const switchClass = (classId: string) => {
    const first = studentsInClass(classId)[0];
    if (!first) return;
    setStoreClass(classId);
    setStoreStudent(first.id);
    router.push(`/academic/report-cycles/${cycle.id}/students/${first.id}/report-card`);
  };

  const downloadPdf = usePrintDownload(
    "Use 'Save as PDF' in the print dialog to download the report card.",
  );
  const setStoreClass = useAppContext((s) => s.setClass);
  const setStoreStudent = useAppContext((s) => s.setStudent);

  // Performance summary cells; the points/division pair appears only where
  // points are printed (secondary classes without the No-Division flag).
  const summaryCells = [
    { label: "Total marks", value: result ? fmtTotalMark(result.total) : "-", accent: false },
    { label: "Average", value: result ? result.average.toFixed(1) : "-", accent: false },
    {
      label: "Overall grade",
      value: result && result.count > 0 ? result.grade : "-",
      accent: true,
    },
    ...(showPoints
      ? [
          {
            label: "Points total",
            value: assessed.length > 0 ? String(pointsTotal) : "-",
            accent: false,
          },
          {
            label: "Division",
            value: division ? `Div ${division.division}` : "—",
            accent: true,
          },
        ]
      : []),
    {
      label: "Subjects passed",
      value: assessed.length > 0 ? `${passed} of ${assessed.length}` : "-",
      accent: false,
    },
    { label: "Class size", value: String(classSize), accent: false },
  ];

  // Attendance row cells; "Not recorded" appears only when > 0 (A3.8).
  const rateText = attendance.rate === null ? "–" : `${attendance.rate.toFixed(1)}%`;
  const attRatingText =
    attendance.rating === "none" ? null : ATTENDANCE_RATING_TEXT[attendance.rating];
  const attCells = [
    {
      label: "Days attended / recorded",
      value: `${attendance.daysAttended} / ${attendance.daysRecorded}`,
    },
    { label: "Attendance rate", value: rateText },
    { label: "Late", value: String(attendance.late) },
    { label: "Absent", value: String(attendance.absent) },
    { label: "Excused", value: String(attendance.excused) },
    ...(attendance.notRecorded > 0
      ? [
          {
            label: "Not recorded",
            value: `${attendance.notRecorded} day${attendance.notRecorded === 1 ? "" : "s"}`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Report card"
        description={`${student.name} · ${classNameOf(student.classId)} · ${cycle.name}`}
      />

      {/* Toolbar: screen only, never printed */}
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-white p-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Class</span>
          {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
          <Select value={student.classId} onValueChange={switchClass}>
            <SelectTrigger className="h-8 w-full text-compact sm:w-45" aria-label="Class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs font-medium text-muted-foreground">Student</span>
          {/* ds-allow-native-select: shadcn Select is a Radix listbox trigger, not a native select */}
          <Select value={student.id} onValueChange={switchStudent}>
            <SelectTrigger className="h-8 w-full text-compact sm:w-65" aria-label="Student">
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

      {/* The printable card: scrollable on a phone, exact A4 sheet in print.
          Totally white paper; every section is a bordered table. */}
      <div className="overflow-x-auto print:overflow-visible">
        <div className="print-area mx-auto w-full max-w-205 border border-border bg-white p-8 font-serif text-foreground shadow-sm">
          {/* School header: logo + school block on white */}
          <div className="flex items-center gap-4">
            <img
              src="/josephian-logo.png"
              alt="Josephian Schools logo"
              className="h-20 w-20 shrink-0"
            />
            <div className="min-w-0 flex-1 text-center">
              <p
                className="text-lg font-bold uppercase tracking-[0.2em]"
                style={{ color: BRAND }}
              >
                {SCHOOL.name}
              </p>
              <p className="mt-0.5 text-xs italic text-muted-foreground">{SCHOOL.motto}</p>
              <p className="mt-0.5 text-2xs text-muted-foreground">
                {SCHOOL.address} · {SCHOOL.phone} · {SCHOOL.email}
              </p>
            </div>
            <div aria-hidden className="h-20 w-20 shrink-0" />
          </div>

          {/* Title band — maroon table header row */}
          <table className={cn(TBL, "mt-4")}>
            <tbody>
              <tr>
                <th scope="colgroup" className="bg-[#5C0A14] px-3 py-2 text-center">
                  <span className="block text-sm font-bold uppercase tracking-[0.3em] text-white">
                    Student Report Card
                  </span>
                  <span className="mt-0.5 block text-2xs font-medium tracking-[0.1em] text-white/85">
                    {cycle.term} · {cycle.academicYear} Academic Year · {cycle.name}
                  </span>
                </th>
              </tr>
            </tbody>
          </table>

          {/* Student particulars */}
          <table className={cn(TBL, "mt-4")}>
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[33%]" />
              <col className="w-[17%]" />
              <col className="w-[33%]" />
            </colgroup>
            <tbody>
              <tr>
                <th colSpan={4} scope="colgroup" className={SECTION_BAR}>
                  Student Particulars
                </th>
              </tr>
              <tr>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Student name
                </th>
                <td className={cn(CELL, "font-medium")}>{student.name}</td>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Admission no
                </th>
                <td className={cn(CELL, "font-medium tabular")}>{student.admissionNo}</td>
              </tr>
              <tr>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Class
                </th>
                <td className={cn(CELL, "font-medium")}>{classNameOf(student.classId)}</td>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Class teacher
                </th>
                <td className={cn(CELL, "font-medium")}>{classTeacherName}</td>
              </tr>
              <tr>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Academic year
                </th>
                <td className={cn(CELL, "font-medium tabular")}>{cycle.academicYear}</td>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Report cycle
                </th>
                <td className={cn(CELL, "font-medium")}>{cycle.name}</td>
              </tr>
              <tr>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Report date
                </th>
                <td className={cn(CELL, "font-medium tabular")}>
                  {fmtLongDate(cycle.reportDate)}
                </td>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  School opens
                </th>
                <td className={cn(CELL, "font-medium tabular")}>
                  {fmtLongDate(cycle.schoolOpensDate)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Subject results — the card's core table: monthly and terminal
              components with their assessment weights, weighted total, grade
              badge and exam-vs-CA progress. Terminal and annual cards quote
              the subject teacher's remark in a full-width row beneath each
              subject; mid-term cards carry no subject comments. */}
          <table className={cn(TBL, "mt-4")}>
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
              <tr>
                <th colSpan={7} scope="colgroup" className={SECTION_BAR}>
                  Subject Results
                </th>
              </tr>
              <tr>
                <th scope="col" className={COL_HEAD}>
                  #
                </th>
                <th scope="col" className={cn(COL_HEAD, "pl-4 text-left")}>
                  Subject
                </th>
                <th scope="col" className={COL_HEAD}>
                  {firstCol.label}
                  <span className="block text-[10px] font-semibold tracking-[0.06em] text-white/80">
                    {firstCol.pct} %
                  </span>
                </th>
                <th scope="col" className={COL_HEAD}>
                  {secondCol.label}
                  <span className="block text-[10px] font-semibold tracking-[0.06em] text-white/80">
                    {secondCol.pct} %
                  </span>
                </th>
                <th scope="col" className={COL_HEAD}>
                  Total
                </th>
                <th scope="col" className={COL_HEAD}>
                  Grade
                </th>
                <th scope="col" className={COL_HEAD}>
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
                      <td
                        className={cn(
                          CELL,
                          "text-center text-2xs tabular text-muted-foreground",
                        )}
                      >
                        {rowIndex + 1}
                      </td>
                      <td className={cn(CELL, "pl-4 text-[15px] font-semibold")}>
                        {subject.name}
                      </td>
                      <td
                        className={cn(
                          CELL,
                          "text-center text-[15px] tabular",
                          ca === null && "text-muted-foreground",
                        )}
                      >
                        {ca ?? "—"}
                      </td>
                      <td
                        className={cn(
                          CELL,
                          "text-center text-[15px] tabular",
                          exam === null && "text-muted-foreground",
                        )}
                      >
                        {exam ?? "—"}
                      </td>
                      <td className={cn(CELL, "text-center text-[15px] font-bold tabular")}>
                        {enrolled && mark !== null ? mark.toFixed(2) : "—"}
                      </td>
                      <td className={cn(CELL, "text-center")}>
                        {enrolled && grade?.grade ? (
                          <span
                            className={cn(
                              "inline-flex size-7 items-center justify-center rounded-full text-sm font-bold",
                              grade.grade === topGrade
                                ? "text-white"
                                : "border border-border bg-white text-foreground",
                            )}
                            style={
                              grade.grade === topGrade ? { backgroundColor: BRAND } : undefined
                            }
                          >
                            {grade.grade}
                          </span>
                        ) : (
                          <span className="text-[15px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className={cn(CELL, "text-center")}>
                        {delta !== null ? (
                          <span
                            className={cn(
                              "text-[15px] font-bold tabular",
                              delta > 0
                                ? "text-[#2D6A4E]"
                                : delta < 0
                                  ? "text-[#C0392B]"
                                  : "text-muted-foreground",
                            )}
                          >
                            {delta > 0 ? "+" : delta < 0 ? "-" : ""}
                            {Math.abs(delta).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[15px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                    {/* Subject teacher's remark — terminal/annual cards only
                        (mid-term and monthly templates have no subject
                        comments), printed without a caption. */}
                    {isTerminalLike ? (
                      <tr>
                        <td colSpan={7} className={cn(CELL, "px-4 py-2")}>
                          <span className="text-compact italic leading-relaxed text-foreground/80">
                            {!enrolled
                              ? "Not taking this subject."
                              : mark !== null
                                ? subjectRemark(mark, scheme)
                                : "Not assessed."}
                          </span>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

          <p className="mt-1.5 text-2xs text-muted-foreground">
            A subject with only one assessment sat carries that mark at 100%; a subject with no
            marks at all is omitted and the remaining rows renumber continuously.
          </p>

          {/* Most improved (primary): the Best-Improvement line above the
              chart carries it on mid-term cards; this line covers the rest. */}
          {mostImproved && mostImprovedSubjectRow && !chartBestImprovement ? (
            <p className="mt-1 text-2xs text-muted-foreground">
              Most improved:{" "}
              <span className="font-medium text-foreground">
                {mostImprovedSubjectRow.subject.name}
              </span>{" "}
              · CA up {mostImproved.delta} marks from last term (largest C2 − C1 gain; a subject
              with a single recorded term counts as 0)
            </p>
          ) : null}

          {/* Performance summary */}
          <table className={cn(TBL, "mt-4")}>
            <tbody>
              <tr>
                <th colSpan={summaryCells.length} scope="colgroup" className={SECTION_BAR}>
                  Performance Summary
                </th>
              </tr>
              <tr>
                {summaryCells.map((cell) => (
                  <th key={cell.label} scope="col" className={cn(CELL, "text-center", CELL_LABEL)}>
                    {cell.label}
                  </th>
                ))}
              </tr>
              <tr>
                {summaryCells.map((cell) => (
                  <td
                    key={cell.label}
                    className={cn(CELL, "text-center text-sm font-bold tabular")}
                    style={cell.accent ? { color: BRAND } : undefined}
                  >
                    {cell.value}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>

          {/* Attendance (A3.8): after the performance summary, before the scales. */}
          <table className={cn(TBL, "mt-4")}>
            <tbody>
              <tr>
                <th colSpan={attCells.length} scope="colgroup" className={SECTION_BAR}>
                  Attendance · Mahudhurio
                </th>
              </tr>
              {attendance.daysRecorded === 0 ? (
                <tr>
                  <td colSpan={attCells.length} className={cn(CELL, "text-center text-compact")}>
                    No attendance recorded for this period.
                  </td>
                </tr>
              ) : (
                <>
                  <tr>
                    {attCells.map((cell) => (
                      <th
                        key={cell.label}
                        scope="col"
                        className={cn(CELL, "text-center", CELL_LABEL)}
                      >
                        {cell.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {attCells.map((cell) => (
                      <td
                        key={cell.label}
                        className={cn(CELL, "text-center text-sm font-bold tabular")}
                      >
                        {cell.value}
                      </td>
                    ))}
                  </tr>
                </>
              )}
              <tr>
                <td colSpan={attCells.length} className={cn(CELL, "text-2xs text-muted-foreground")}>
                  Period covered: {fmtDateRange(attendance.from, attendance.to)}
                  {attRatingText ? ` — ${attRatingText}` : ""}
                  {attendance.notRecorded > 0
                    ? " · Days not recorded have no counted register and are never counted as absent."
                    : ""}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Grade scale — rendered from the class scheme. */}
          <table className={cn(TBL, "mt-4")}>
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[18%]" />
              <col />
              {showPoints ? <col className="w-[12%]" /> : null}
            </colgroup>
            <thead>
              <tr>
                <th
                  colSpan={showPoints ? 4 : 3}
                  scope="colgroup"
                  className={SECTION_BAR}
                >
                  Grading Scale
                </th>
              </tr>
              <tr>
                <th scope="col" className={COL_HEAD}>
                  Grade
                </th>
                <th scope="col" className={COL_HEAD}>
                  Marks
                </th>
                <th scope="col" className={COL_HEAD}>
                  Remark
                </th>
                {showPoints ? (
                  <th scope="col" className={COL_HEAD}>
                    Points
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {scheme.boundaries.map((b) => {
                const achieved = result?.grade === b.grade;
                return (
                  <tr key={b.grade}>
                    <td
                      className={cn(CELL, "text-center font-bold")}
                      style={achieved ? { color: BRAND } : undefined}
                    >
                      {b.grade}
                      {achieved ? " ▲" : ""}
                    </td>
                    <td className={cn(CELL, "text-center tabular")}>
                      {b.min}–{b.max}
                    </td>
                    <td className={CELL}>{b.remark}</td>
                    {showPoints ? (
                      <td className={cn(CELL, "text-center tabular")}>{b.points}</td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Division scale + gap text (A4 section 8); C6 wording when the
              student has fewer than 7 graded subjects. Primary and no-division
              classes print no division section at all. */}
          {showPoints ? (
            <table className={cn(TBL, "mt-4")}>
              <colgroup>
                <col className="w-[18%]" />
                <col className="w-[22%]" />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={3} scope="colgroup" className={SECTION_BAR}>
                    Division Scale
                  </th>
                </tr>
                <tr>
                  <th scope="col" className={COL_HEAD}>
                    Division
                  </th>
                  <th scope="col" className={COL_HEAD}>
                    Points
                  </th>
                  <th scope="col" className={COL_HEAD}>
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIVISION_BANDS.map((b) => {
                  const achieved = division?.division === b.division;
                  return (
                    <tr key={b.division}>
                      <td
                        className={cn(CELL, "text-center font-bold")}
                        style={achieved ? { color: BRAND } : undefined}
                      >
                        Div {b.division}
                        {achieved ? " ▲" : ""}
                      </td>
                      <td className={cn(CELL, "text-center tabular")}>
                        {b.min}–{b.max}
                      </td>
                      <td className={CELL}>
                        {b.label}
                        {achieved && division ? ` — ${division.pointsSum} pts` : ""}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={3} className={cn(CELL, "text-2xs text-muted-foreground")}>
                    {division
                      ? division.gapToDivisionI <= 0
                        ? "Highest division achieved — computed from the best 7 graded subject points."
                        : `${division.gapToDivisionI} point${division.gapToDivisionI === 1 ? "" : "s"} from Division I — computed from the best 7 graded subject points.`
                      : "Division: not computed (fewer than 7 graded subjects)."}
                  </td>
                </tr>
              </tbody>
            </table>
          ) : null}

          {/* Performance chart section (table-wrapped) */}
          {assessed.length > 0 ? (
            <PerformanceChartSection
              variant={variant}
              chartImage={chartImage}
              rows={chartRows}
              strongest={
                strongest ? { name: strongest.subject.name, score: strongest.mark as number } : null
              }
              bestImprovement={chartBestImprovement}
              isPrimary={isPrimary}
            />
          ) : null}

          {/* Remarks */}
          <table className={cn(TBL, "mt-4")}>
            <colgroup>
              <col className="w-[22%]" />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <th colSpan={2} scope="colgroup" className={SECTION_BAR}>
                  Remarks
                </th>
              </tr>
              {isTerminalLike ? (
                // Terminal/annual: no "Class teacher's remark" caption — the
                // remark prints alone; a missing remark leaves blank space.
                <tr>
                  <td
                    colSpan={2}
                    className={cn(CELL, "text-compact leading-relaxed text-foreground/80")}
                  >
                    {comment.classTeacher ?? "\u00A0"}
                  </td>
                </tr>
              ) : (
                <tr>
                  <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                    Class teacher&apos;s remark
                  </th>
                  <td className={cn(CELL, "text-compact leading-relaxed text-foreground/80")}>
                    {comment.classTeacher ?? "Awaiting remark"}
                  </td>
                </tr>
              )}
              <tr>
                <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
                  Parental involvement
                </th>
                <td className={cn(CELL, "text-compact leading-relaxed text-foreground/80")}>
                  {comment.parentalInvolvement ?? "Awaiting input"}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer: parents' day + signatures */}
          <p className="mt-5 text-center text-xs text-muted-foreground">
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
