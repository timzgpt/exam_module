import { ATTENDANCE_RATING_TEXT } from "@/lib/attendance";
import { fmtDateRange } from "@/lib/format";
import type { AttendanceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Attendance summary for report cards (knowledge base A3.8, component
 * B2.15). EN labels are primary; the KB's Swahili register labels appear as
 * secondary text on parent-facing surfaces ("Mahudhurio") pending
 * confirmation by a native speaker — English prevails on any discrepancy.
 *
 * Rules baked in:
 * - Days attended = present + late (late counts as attended).
 * - Rate = (present + late) / (present + late + absent + excused), 1 dp.
 * - "Not recorded" days are shown separately, only when > 0, and are never
 *   counted as absent.
 * - Parent-facing wording says "Absent", never "Unexcused"; no notes,
 *   reasons or correction history are shown.
 * - Text always accompanies colour (the rate bar carries its rating text).
 */
export function AttendanceSummaryCard({
  summary,
  variant = "screen",
  className,
}: {
  summary: AttendanceSummary;
  /** "print" matches the A4 card palette; "screen" the ERP surface. */
  variant?: "screen" | "print";
  className?: string;
}) {
  const isPrint = variant === "print";
  const ratingText =
    summary.rating === "none" ? null : ATTENDANCE_RATING_TEXT[summary.rating];
  const rateText = summary.rate === null ? "–" : `${summary.rate.toFixed(1)}%`;

  const stats: { label: string; sw?: string; value: string; warn?: boolean }[] = [
    { label: "Late", sw: "Kuchelewa", value: String(summary.late) },
    { label: "Absent", sw: "Hayupo", value: String(summary.absent) },
    { label: "Excused", sw: "Ruhusa", value: String(summary.excused) },
  ];
  if (summary.notRecorded > 0) {
    stats.push({
      label: "Not recorded",
      value: `${summary.notRecorded} day${summary.notRecorded === 1 ? "" : "s"}`,
    });
  }

  return (
    <section
      aria-label="Attendance summary"
      className={cn(
        isPrint
          ? "border border-border p-3"
          : "rounded-lg border border-border/80 bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Attendance · <span className="normal-case">Mahudhurio</span>
        </p>
        <p className="text-2xs tabular text-muted-foreground">
          {summary.daysAttended} / {summary.daysRecorded} days attended
        </p>
      </div>

      {summary.daysRecorded === 0 ? (
        <p className="mt-2 text-compact text-muted-foreground">
          No attendance recorded for this period.
        </p>
      ) : (
        <div className="mt-2.5 grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(11rem,1.2fr)_1fr]">
          {/* Rate + rating + thin bar */}
          <div>
            <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Attendance rate
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular">{rateText}</p>
            <div
              role="img"
              aria-label={`Attendance rate ${rateText}${ratingText ? ` — ${ratingText}` : ""}`}
              className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  summary.rating === "concern"
                    ? "bg-destructive/70"
                    : summary.rating === "needs-improvement"
                      ? "bg-warning/80"
                      : "bg-primary/70",
                )}
                style={{ width: `${Math.min(100, summary.rate ?? 0)}%` }}
              />
            </div>
            {ratingText ? (
              <p className="mt-1 text-2xs font-medium text-foreground/80">{ratingText}</p>
            ) : null}
          </div>

          {/* Days attended vs recorded */}
          <div>
            <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Days attended / school days recorded
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular">
              {summary.daysAttended} / {summary.daysRecorded}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">
              of {summary.possibleSchoolDays} possible school days
            </p>
          </div>

          {/* Late / Absent / Excused / Not recorded */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                  {s.sw ? <span className="ml-1 normal-case text-muted-foreground/70">({s.sw})</span> : null}
                </p>
                <p className="text-compact font-semibold tabular">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-3 border-t border-border/60 pt-1.5 text-2xs text-muted-foreground">
        Period covered: {fmtDateRange(summary.from, summary.to)}
        {summary.notRecorded > 0
          ? " · Days not recorded have no counted register and are never counted as absent."
          : ""}
      </p>
    </section>
  );
}
