"use client";

import { useNurseryAssessment, useClassTemplateConfig } from "@/hooks/use-class-template";
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
 * kind (task §2/§6). The four layouts follow the school's sample templates:
 *
 *   baby-class-a  Area | Skills / milestones | Teacher's Comments
 *   baby-class-b  Domain | Benchmark | Teacher's remarks (row per benchmark)
 *   kg1           Learning area | Benchmark | Teachers' remarks
 *   kg2 / kg3     Learning area | Benchmark | Competency grade (B/D/C/HC)
 *                 + a dedicated comments row per learning area
 *
 * Every layout prints on the shared white-paper chrome (maroon bands,
 * bordered tables, sign-off block) and keeps each learning area atomic in
 * print via the global per-tbody break rule.
 */

const EMPTY_REMARK = "Awaiting teacher's remarks";

function remarkOr(v: string | undefined): string {
  return v && v.trim().length > 0 ? v : EMPTY_REMARK;
}

/** Competency chip: the code is always printed (never colour alone). */
function GradeChip({
  code,
  scale,
}: {
  code: CompetencyCode | null | undefined;
  scale: CompetencyScale | null;
}) {
  if (!code) return <span className="text-[15px] text-muted-foreground">—</span>;
  const level = scale?.levels.find((l) => l.code === code);
  return (
    <span
      title={level ? `${code} — ${level.label}: ${level.description}` : code}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full text-sm font-bold",
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
  const config = useClassTemplateConfig(student.classId);
  const assessment = useNurseryAssessment(student.classId, student.id, cycle);
  const classTeacherName =
    teacherById(classById(student.classId)?.classTeacherId)?.name ?? "—";

  return (
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
        <RemarksTemplate config={config} assessment={assessment} />
      ) : (
        <CompetencyTemplate config={config} assessment={assessment} />
      )}

      {/* Class teacher's concluding comment — stored independently of the
          learning-area remarks/comments (task §5) — together with the
          authorizing signatures forms ONE atomic print block, so the
          sign-off never orphans alone on a mostly blank page (task §7). */}
      <div className="print-keep-together">
        <table className={cn(TBL, "mt-4")}>
          <tbody>
            <tr>
              <th colSpan={2} scope="colgroup" className={SECTION_BAR}>
                {config.classTeacherCommentLabel}
              </th>
            </tr>
            <tr>
              <th scope="row" className={cn(CELL, "w-[24%] text-left", CELL_LABEL)}>
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
        {"\u25C6"} {SCHOOL.name} · {SCHOOL.address} {"\u25C6"}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------
 * Template A — Area of Development | Skills | Teacher's Comments
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
        <col className="w-[24%]" />
        <col className="w-[38%]" />
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
        // One atomic tbody per area: the area's skills and comment never split.
        <tbody key={area.id}>
          <tr>
            <th
              scope="row"
              className={cn(CELL, "align-top text-left text-[15px] font-semibold")}
            >
              {area.name}
            </th>
            <td className={cn(CELL, "align-top")}>
              {area.benchmarks.map((b) => (
                <p key={b.id} className="text-compact leading-relaxed text-foreground/85">
                  <span aria-hidden className="mr-1.5" style={{ color: BRAND }}>
                    •
                  </span>
                  {b.text}
                </p>
              ))}
            </td>
            <td className={cn(CELL, "align-top text-compact italic leading-relaxed text-foreground/80")}>
              {remarkOr(assessment.areaRemarks[area.id])}
            </td>
          </tr>
        </tbody>
      ))}
    </table>
  );
}

/* ----------------------------------------------------------------
 * Templates B & KG1 — Area | Benchmark | Teacher's remarks
 * ---------------------------------------------------------------- */

function RemarksTemplate({
  config,
  assessment,
}: {
  config: NurseryTemplateConfig;
  assessment: NurseryAssessment;
}) {
  const areaHead =
    config.kind === "baby-class-b" ? "Developmental Domain" : "Learning Area";
  return (
    <table className={cn(TBL, "mt-4")}>
      <colgroup>
        <col className="w-[24%]" />
        <col className="w-[38%]" />
        <col />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={3} scope="colgroup" className={SECTION_BAR}>
            {config.kind === "baby-class-b"
              ? "Developmental Domains"
              : "Learning Areas"}
          </th>
        </tr>
        <tr>
          <th scope="col" className={COL_HEAD}>
            {areaHead}
          </th>
          <th scope="col" className={COL_HEAD}>
            {config.kind === "baby-class-b"
              ? "Developmental benchmark"
              : "Benchmark"}
          </th>
          <th scope="col" className={COL_HEAD}>
            {config.areaRemarkLabel ?? "Teacher's remarks"}
          </th>
        </tr>
      </thead>
      {config.areas.map((area) => (
        // Atomic per area: the rowSpan cell and every benchmark row stay together.
        <tbody key={area.id}>
          {area.benchmarks.map((b, i) => (
            <tr key={b.id}>
              {i === 0 ? (
                <th
                  scope="rowgroup"
                  rowSpan={area.benchmarks.length}
                  className={cn(CELL, "align-top text-left text-[15px] font-semibold")}
                >
                  {area.name}
                </th>
              ) : null}
              <td className={cn(CELL, "align-top text-compact leading-relaxed text-foreground/85")}>
                {b.text}
              </td>
              {i === 0 ? (
                <td
                  rowSpan={area.benchmarks.length}
                  className={cn(CELL, "align-top text-compact italic leading-relaxed text-foreground/80")}
                >
                  {remarkOr(assessment.areaRemarks[area.id])}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}

/* ----------------------------------------------------------------
 * KG2 / KG3 — Area | Benchmark | Competency grade + area comments
 * ---------------------------------------------------------------- */

function CompetencyTemplate({
  config,
  assessment,
}: {
  config: NurseryTemplateConfig;
  assessment: NurseryAssessment;
}) {
  return (
    <>
      <table className={cn(TBL, "mt-4")}>
        <colgroup>
          <col className="w-[24%]" />
          <col />
          <col className="w-[11%]" />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={3} scope="colgroup" className={SECTION_BAR}>
              Learning Areas &amp; Competencies
            </th>
          </tr>
          <tr>
            <th scope="col" className={COL_HEAD}>
              Learning Area
            </th>
            <th scope="col" className={COL_HEAD}>
              Benchmark
            </th>
            <th scope="col" className={COL_HEAD}>
              Grade
            </th>
          </tr>
        </thead>
        {config.areas.map((area) => (
          // Atomic per area: benchmark grades + the area's own comment row.
          <tbody key={area.id}>
            {area.benchmarks.map((b, i) => (
              <tr key={b.id}>
                {i === 0 ? (
                  <th
                    scope="rowgroup"
                    rowSpan={area.benchmarks.length}
                    className={cn(CELL, "align-top text-left text-[15px] font-semibold")}
                  >
                    {area.name}
                  </th>
                ) : null}
                <td className={cn(CELL, "align-top text-compact leading-relaxed text-foreground/85")}>
                  {b.text}
                </td>
                <td className={cn(CELL, "text-center")}>
                  <GradeChip code={assessment.benchmarkGrades[b.id]} scale={config.scale} />
                </td>
              </tr>
            ))}
            <tr>
              <td className={cn(CELL, "align-top", CELL_LABEL)}>
                {config.areaCommentLabel ?? "Comments"}
              </td>
              <td
                colSpan={2}
                className={cn(
                  CELL,
                  "align-top text-compact italic leading-relaxed text-foreground/80",
                )}
              >
                {remarkOr(assessment.areaComments[area.id])}
              </td>
            </tr>
          </tbody>
        ))}
      </table>
      <ScaleLegend scale={config.scale} />
    </>
  );
}
