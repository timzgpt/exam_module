"use client";

import { Fragment } from "react";
import { useNurseryAssessment, useClassTemplateConfig } from "@/hooks/use-class-template";
import { nurseryPeriodForCycle } from "@/lib/report-templates";
import { fmtLongDate } from "@/lib/format";
import { SCHOOL } from "@/lib/demo-config";
import { classNameOf, teacherById, classById } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import type {
  CompetencyCode,
  CompetencyScale,
  NurseryAssessment,
  NurseryTemplateConfig,
  ReportCycle,
  Student,
} from "@/lib/types";
import {
  BRAND,
  CELL,
  CELL_LABEL,
  COL_HEAD,
  SECTION_BAR,
  TBL,
} from "@/components/features/report-card/card-chrome";

/**
 * Early Years report cards — one self-contained printable card per template
 * kind (task §2/§6). Each layout follows the school's sample reports:
 *
 *   baby-class-a  Portrait. Area of Development | Skills | Teacher's Comments,
 *                 with a comment written against every skill.
 *   baby-class-b  Landscape. 4 developmental domains in PARALLEL columns, each
 *                 Benchmark | Teacher's remarks (one remark per benchmark).
 *   kg1           Landscape. 4 learning areas in parallel, Benchmark | remarks.
 *   kg2 / kg3     Landscape. 5 / 6 learning areas in parallel, Benchmark | B/D/C/HC
 *                 competency grade, with a dedicated Comments row per area.
 *
 * Template A prints portrait; every other Early Years template prints
 * landscape A4 (the parallel columns need the width). All share the
 * white-paper chrome (maroon title band, bordered tables, sign-off block).
 */

const EMPTY_REMARK = "Awaiting teacher's remarks";

function remarkOr(v: string | undefined): string {
  return v && v.trim().length > 0 ? v : EMPTY_REMARK;
}

/**
 * Distinct, professional header fill per parallel learning-area column. The
 * reference reports colour each domain/area header differently (task §2 —
 * "preserve the four distinct domain header colours"); these keep the
 * school's deep palette and print legibly with white text.
 */
const AREA_HEADER_COLORS = [
  "#5C0A14", // brand maroon
  "#0F6E6E", // teal
  "#8A5A12", // ochre
  "#34557E", // slate blue
  "#4C6A2B", // olive
  "#7A3B5E", // plum
];

function areaColor(i: number): string {
  return AREA_HEADER_COLORS[i % AREA_HEADER_COLORS.length];
}

/** Sub-column heading cell for the parallel tables (neutral, bordered). */
const SUB_HEAD =
  "border border-border bg-muted px-2 py-1 text-3xs font-bold uppercase tracking-[0.1em] text-foreground/80";

/** Competency chip: the code is always printed (never colour alone). */
function GradeChip({
  code,
  scale,
}: {
  code: CompetencyCode | null | undefined;
  scale: CompetencyScale | null;
}) {
  if (!code) return <span className="text-sm text-muted-foreground">—</span>;
  const level = scale?.levels.find((l) => l.code === code);
  return (
    <span
      title={level ? `${code} — ${level.label}: ${level.description}` : code}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
        code === "HC"
          ? "text-white"
          : "border border-border bg-white text-foreground",
      )}
      style={code === "HC" ? { backgroundColor: BRAND } : undefined}
    >
      {code}
    </span>
  );
}

/** Legend line under the competency table, built from the configured scale. */
function ScaleLegend({ scale }: { scale: CompetencyScale | null }) {
  if (!scale) return null;
  return (
    <p className="mt-1.5 text-2xs text-muted-foreground">
      {scale.levels.map((l) => `${l.code} — ${l.label}`).join("  ·  ")}
    </p>
  );
}

interface NurseryReportCardProps {
  student: Student;
  cycle: ReportCycle;
}

/** The printable card body — wrapped by the toolbar on the staff page. */
export function NurseryReportCard({
  student,
  cycle,
}: NurseryReportCardProps) {
  const config = useClassTemplateConfig(student.classId, nurseryPeriodForCycle(cycle));
  const assessment = useNurseryAssessment(student.classId, student.id, cycle);
  const classTeacherName =
    teacherById(classById(student.classId)?.classTeacherId)?.name ?? "—";

  // Template A prints portrait; the parallel-column templates print landscape.
  const landscape = config.kind !== "baby-class-a";

  return (
    <div
      className={cn(
        "print-area mx-auto w-full border border-border bg-white p-8 font-serif text-foreground shadow-sm",
        landscape ? "max-w-300 print-landscape" : "max-w-205",
      )}
    >
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
            {SCHOOL.name.toUpperCase()}
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
                {config.title}
              </span>
              <span className="mt-0.5 block text-2xs font-medium tracking-[0.1em] text-white/85">
                {cycle.term} · {cycle.academicYear} Academic Year · {cycle.name}
              </span>
            </th>
          </tr>
        </tbody>
      </table>

      {/* Learner particulars */}
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
              Learner&apos;s Particulars
            </th>
          </tr>
          <tr>
            <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
              Learner&apos;s name
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
              {config.assessmentDateLabel}
            </th>
            <td className={cn(CELL, "font-medium tabular")}>
              {fmtLongDate(assessment.assessedOn)}
            </td>
            <th scope="row" className={cn(CELL, "text-left", CELL_LABEL)}>
              Report cycle
            </th>
            <td className={cn(CELL, "font-medium")}>{cycle.name}</td>
          </tr>
        </tbody>
      </table>

      {/* Template body — the four layouts (task §2/§6) */}
      {config.kind === "baby-class-a" ? (
        <BabyClassTemplateA config={config} assessment={assessment} />
      ) : config.kind === "baby-class-b" || config.kind === "kg1" ? (
        <ParallelRemarksTable config={config} assessment={assessment} />
      ) : (
        <ParallelCompetencyTable config={config} assessment={assessment} />
      )}

      {/* Class teacher's concluding comment — stored independently of the
          learning-area remarks/comments (task §5) — together with the
          authorizing signatures forms ONE atomic print block. */}
      <div className="print-keep-together">
        <table className={cn(TBL, "mt-4")}>
          <tbody>
            <tr>
              <th colSpan={2} scope="colgroup" className={SECTION_BAR}>
                {config.classTeacherCommentLabel}
              </th>
            </tr>
            <tr>
              <th scope="row" className={cn(CELL, "w-[22%] text-left", CELL_LABEL)}>
                Class teacher
              </th>
              <td className={cn(CELL, "text-compact leading-relaxed text-foreground/80")}>
                {remarkOr(assessment.classTeacherComment)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Authorizing signatures */}
        <table className={cn(TBL, "mt-4")}>
          <tbody>
            <tr>
              <th scope="colgroup" className={SECTION_BAR}>
                Authorizing Signatures
              </th>
            </tr>
          </tbody>
        </table>
        <div className="mt-6 grid grid-cols-2 gap-8 text-center text-compact sm:grid-cols-3">
          {config.signatures.map((sig) => (
            <div key={sig.id}>
              <div className="mx-auto w-40 border-t border-foreground/30" />
              <p className="mt-1 text-xs font-medium text-foreground">{sig.name}</p>
              <p className="mt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {sig.title}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer seal */}
      <p className="mt-6 text-center text-2xs text-muted-foreground">
        {"◆"} {SCHOOL.name} · {SCHOOL.address} {"◆"}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Template A — portrait. Area of Development | Skills | Teacher's
 * Comments, with one comment written against every skill.
 * ---------------------------------------------------------------- */

function BabyClassTemplateA({
  config,
  assessment,
}: {
  config: NurseryTemplateConfig;
  assessment: NurseryAssessment;
}) {
  return (
    <table className={cn(TBL, "mt-4")}>
      <colgroup>
        <col className="w-[22%]" />
        <col className="w-[40%]" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={3} scope="colgroup" className={SECTION_BAR}>
            Developmental Assessment
          </th>
        </tr>
        <tr>
          <th scope="col" className={COL_HEAD}>
            Area of Development
          </th>
          <th scope="col" className={COL_HEAD}>
            Skills / developmental milestones
          </th>
          <th scope="col" className={COL_HEAD}>
            {config.areaRemarkLabel ?? "Teacher's Comments"}
          </th>
        </tr>
      </thead>
      {config.areas.map((area) => (
        // One atomic tbody per area: its skills and comments never split.
        <tbody key={area.id}>
          {area.benchmarks.map((b, i) => (
            <tr key={b.id}>
              {i === 0 ? (
                <th
                  scope="rowgroup"
                  rowSpan={area.benchmarks.length}
                  className={cn(CELL, "align-top text-left text-sm font-semibold")}
                >
                  {area.name}
                </th>
              ) : null}
              <td className={cn(CELL, "align-top text-compact leading-relaxed text-foreground/85")}>
                {b.text}
              </td>
              <td className={cn(CELL, "align-top text-compact italic leading-relaxed text-foreground/80")}>
                {remarkOr(assessment.benchmarkRemarks[b.id])}
              </td>
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/* ----------------------------------------------------------------
 * Templates B & KG1 — landscape, learning areas in PARALLEL columns.
 * Each area spans two columns: Benchmarks | Teachers' remarks, with
 * a narrative remark per benchmark.
 * ---------------------------------------------------------------- */

function ParallelRemarksTable({
  config,
  assessment,
}: {
  config: NurseryTemplateConfig;
  assessment: NurseryAssessment;
}) {
  const areas = config.areas;
  const maxRows = Math.max(1, ...areas.map((a) => a.benchmarks.length));
  const remarkHead = config.areaRemarkLabel ?? "Teachers' remarks";
  const sectionLabel =
    config.kind === "baby-class-b" ? "Developmental Domains" : "Learning Areas";

  return (
    <div className="mt-4 overflow-x-auto nursery-grid-wrap">
      <table
        className="nursery-grid-table w-full border-collapse"
        style={{ minWidth: `${areas.length * 230}px` }}
      >
        <thead>
          <tr>
            <th colSpan={areas.length * 2} scope="colgroup" className={SECTION_BAR}>
              {sectionLabel}
            </th>
          </tr>
          <tr>
            {areas.map((a, idx) => (
              <th
                key={a.id}
                colSpan={2}
                scope="colgroup"
                className="border border-border px-2 py-1.5 text-center text-xs font-bold uppercase tracking-[0.08em] text-white"
                style={{ backgroundColor: areaColor(idx) }}
              >
                {a.name}
              </th>
            ))}
          </tr>
          <tr>
            {areas.map((a) => (
              <Fragment key={a.id}>
                <th scope="col" className={cn(SUB_HEAD, "w-[11%]")}>
                  Benchmarks
                </th>
                <th scope="col" className={SUB_HEAD}>
                  {remarkHead}
                </th>
              </Fragment>
            ))}
          </tr>
        </thead>
        {/* Row-level pagination: a tall domain table may break between rows. */}
        <tbody className="nursery-grid-body">
          {Array.from({ length: maxRows }).map((_, i) => (
            <tr key={i}>
              {areas.map((a) => {
                const b = a.benchmarks[i];
                return (
                  <Fragment key={a.id}>
                    <td className={cn(CELL, "align-top text-2xs font-medium leading-snug text-foreground/90")}>
                      {b ? b.text : ""}
                    </td>
                    <td className={cn(CELL, "align-top text-2xs italic leading-snug text-foreground/75")}>
                      {b ? remarkOr(assessment.benchmarkRemarks[b.id]) : ""}
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ----------------------------------------------------------------
 * KG2 / KG3 — landscape, learning areas in PARALLEL columns.
 * Each area spans two columns: Benchmarks | Grade (B/D/C/HC), then a
 * dedicated Comments row carrying one comment per area.
 * ---------------------------------------------------------------- */

function ParallelCompetencyTable({
  config,
  assessment,
}: {
  config: NurseryTemplateConfig;
  assessment: NurseryAssessment;
}) {
  const areas = config.areas;
  const maxRows = Math.max(1, ...areas.map((a) => a.benchmarks.length));
  const commentLabel = config.areaCommentLabel ?? "Comments";

  return (
    <>
      <div className="mt-4 overflow-x-auto nursery-grid-wrap">
        <table
          className="nursery-grid-table w-full border-collapse"
          style={{ minWidth: `${areas.length * 190}px` }}
        >
          <thead>
            <tr>
              <th colSpan={areas.length * 2} scope="colgroup" className={SECTION_BAR}>
                Learning Areas &amp; Competencies
              </th>
            </tr>
            <tr>
              {areas.map((a, idx) => (
                <th
                  key={a.id}
                  colSpan={2}
                  scope="colgroup"
                  className="border border-border px-2 py-1.5 text-center text-2xs font-bold uppercase tracking-[0.06em] text-white"
                  style={{ backgroundColor: areaColor(idx) }}
                >
                  {a.name}
                </th>
              ))}
            </tr>
            <tr>
              {areas.map((a) => (
                <Fragment key={a.id}>
                  <th scope="col" className={SUB_HEAD}>
                    Benchmarks
                  </th>
                  <th scope="col" className={cn(SUB_HEAD, "w-[7%] text-center")}>
                    Grade
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="nursery-grid-body">
            {Array.from({ length: maxRows }).map((_, i) => (
              <tr key={i}>
                {areas.map((a) => {
                  const b = a.benchmarks[i];
                  return (
                    <Fragment key={a.id}>
                      <td className={cn(CELL, "align-top text-2xs font-medium leading-snug text-foreground/90")}>
                        {b ? b.text : ""}
                      </td>
                      <td className={cn(CELL, "text-center align-top")}>
                        {b ? (
                          <GradeChip
                            code={assessment.benchmarkGrades[b.id]}
                            scale={config.scale}
                          />
                        ) : null}
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {/* Dedicated per-area comments row — kept together in print. */}
          <tbody className="print-keep-together">
            <tr>
              {areas.map((a, idx) => (
                <th
                  key={a.id}
                  colSpan={2}
                  className="border border-border px-2 py-1 text-center text-3xs font-bold uppercase tracking-[0.12em] text-white"
                  style={{ backgroundColor: areaColor(idx) }}
                >
                  {commentLabel}
                </th>
              ))}
            </tr>
            <tr>
              {areas.map((a) => (
                <td
                  key={a.id}
                  colSpan={2}
                  className={cn(CELL, "align-top text-2xs italic leading-snug text-foreground/75")}
                >
                  {remarkOr(assessment.areaComments[a.id])}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <ScaleLegend scale={config.scale} />
    </>
  );
}
