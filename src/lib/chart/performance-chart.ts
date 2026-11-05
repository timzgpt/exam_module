/**
 * Josephian Schools — performance bar chart engine (report-card section 6).
 *
 * TypeScript port of the legacy `report_chart.py` pipeline, kept rule-for-rule
 * with the authoritative "REPORT CARD CHART SYSTEM" prompt:
 *
 *  - ONE chart per card: a grouped bar chart with exactly 3 series per
 *    subject — Achieved Marks (red), Class Avg (blue), Class Topper (green).
 *  - The strongest subject's achieved bar is drawn in darker red.
 *  - Every non-zero bar carries its value label above it.
 *  - Subjects without a total are excluded (same rule as the table).
 *  - Class stats are recomputed from every classmate's weighted score; the
 *    Mid-Term engine counts a single assessment at 100%, the Terminal engine
 *    only counts students with BOTH components.
 *  - X labels go through the LABEL_SHORT shortening maps with the
 *    14-character fallback.
 *  - Rendering is STATIC and DETERMINISTIC: the chart is emitted as a pure
 *    SVG string (data URI) baked at generation time — no JS chart library,
 *    no async rendering, no client-side layout — so any HTML→PDF capture
 *    (Playwright or browser print) sees the finished chart immediately.
 *    This is the stack-native equivalent of the legacy base64 PNG at 150 dpi;
 *    being vector it stays crisp at any print resolution.
 *
 * Geometry, colours, font scaling, label rotation, y-axis ceilings and the
 * Mid-Term/Terminal differences below mirror Sections 1, 2, 5, 6 and 9 of
 * the chart prompt exactly.
 */

/* ================================================================
 * Variant + shared constants (prompt Sections 1, 2)
 * ================================================================ */

export type ChartVariant = "mid-term" | "terminal";

/** Pixels per matplotlib point at the fixed 150 dpi export (rule 7). */
const PT = 150 / 72;

const COLORS = {
  achieved: "#E74C3C",
  achievedEdge: "#C0392B",
  achievedStrong: "#C0392B",
  achievedStrongEdgeMid: "#7B241C",
  avg: "#3498DB",
  avgEdge: "#2980B9",
  top: "#2ECC71",
  topEdge: "#27AE60",
  label: "#1C1008",
  spine: "#000000",
} as const;

export const CHART_TITLE = "Result Analysis in Percentage";
export const Y_AXIS_LABEL = "% Percentage";
export const X_AXIS_LABEL = "Subjects";
/** Printed above the chart image when the series is empty (prompt §7). */
export const CHART_FALLBACK_TEXT = "No complete subject scores to chart.";

/* ================================================================
 * Subject label shortening (prompt Section 5)
 * ================================================================ */

/** Mid-Term map — full coverage of Primary + Secondary subject names. */
const LABEL_SHORT_MID: Record<string, string> = {
  Arithmetic: "Arithmetic",
  "English Language Skills": "English",
  Kiswahili: "Kiswahili",
  Reading: "Reading",
  Writing: "Writing",
  "Culture, Arts & Sports": "Culture & Arts",
  "Culture, Art & Sports": "Culture & Arts",
  "Health & Environment": "Health & Env.",
  Mathematics: "Math",
  English: "English",
  "Historia na Maadili": "Hist. & Maadili",
  Geography: "Geography",
  "Business Studies": "Business",
  History: "History",
  Physics: "Physics",
  Chemistry: "Chemistry",
  Biology: "Biology",
  Bookkeeping: "Bookkeeping",
  "Computer Science": "Comp. Sci.",
  "Science & Technology": "Science & Tech",
  "Historia ya Tanzania na Maadili": "Historia",
  "Historia ya Tanzania Na Maadili": "Historia",
  "Geography & Environment": "Geog. & Env.",
  "Arts and Sports": "Arts & Sports",
  Music: "Music",
  "Vocational Skills": "Vocational",
  "Social Studies (SST)": "Social Studies",
  ICT: "ICT",
  "Civic and Moral Education": "Civic & Moral",
  // Agent rule 5: this app offers "Computer Studies" (16 chars) — mapped so
  // the axis label is never truncated to "Computer Stu.".
  "Computer Studies": "Comp. Studies",
};

/**
 * Terminal map — secondary-focused (missing some Primary names by design;
 * the original Terminal template predates the Grades 3–6 additions).
 */
const LABEL_SHORT_TERMINAL: Record<string, string> = {
  Arithmetic: "Arithmetic",
  "English Language Skills": "English",
  Kiswahili: "Kiswahili",
  Reading: "Reading",
  Writing: "Writing",
  "Culture, Arts & Sports": "Culture & Arts",
  "Health & Environment": "Health & Env.",
  Mathematics: "Math",
  English: "English",
  "Historia na Maadili": "Hist. & Maadili",
  Geography: "Geography",
  "Business Studies": "Business",
  History: "History",
  Physics: "Physics",
  Chemistry: "Chemistry",
  Biology: "Biology",
  Bookkeeping: "Bookkeeping",
  "Computer Science": "Comp. Sci.",
  // Agent rule 5: keep this app's ICT subject readable in both trees.
  "Computer Studies": "Comp. Studies",
};

/**
 * `short_label()`: dictionary first; otherwise the full name when ≤ 14
 * chars; otherwise the first 12 chars + ".".
 */
export function shortLabel(name: string, variant: ChartVariant): string {
  const map = variant === "mid-term" ? LABEL_SHORT_MID : LABEL_SHORT_TERMINAL;
  const mapped = map[name];
  if (mapped !== undefined) return mapped;
  if (name.length <= 14) return name;
  return `${name.slice(0, 12)}.`;
}

/* ================================================================
 * Class stats scoring (prompt Section 4)
 * ================================================================ */

/**
 * Weighted score of ONE student in ONE subject, as used by the chart's
 * class stats (`compute_class_stats`).
 *
 * - Mid-Term engine: same 25/75 formula as the report service — a student
 *   with only one assessment contributes that mark at 100% (the "100% rule",
 *   rule 9).
 * - Terminal engine: STRICTER — a student missing either component is
 *   skipped for that subject entirely.
 *
 * Weights are marks out of 100 (the class subject's own CA/Exam split).
 */
export function classScoreFor(
  variant: ChartVariant,
  ca: number | null,
  exam: number | null,
  caMarks: number,
  examMarks: number,
): number | null {
  if (ca === null && exam === null) return null;
  if (variant === "terminal" && (ca === null || exam === null)) return null;
  if (ca === null) return exam;
  if (exam === null) return ca;
  return Math.round((ca * (caMarks / 100) + exam * (examMarks / 100)) * 100) / 100;
}

/* ================================================================
 * Series builder (prompt Sections 3, rule 4, rule 8)
 * ================================================================ */

export interface ChartSeriesRow {
  /** Full subject name — exactly the string used for strongest matching. */
  name: string;
  /** Student's weighted total; null ("-" in the legacy table) excludes the row. */
  achieved: number | null;
}

export interface ChartSeries {
  labels: string[];
  achieved: number[];
  avg: number[];
  top: number[];
  strongestIdx: number;
}

/**
 * `build_chart_series()`: pairs the student's rows with the class stats and
 * produces the chart input. Rows without a total are skipped (rule 8 — a
 * subject skipped in the table is always skipped in the chart). Labels are
 * shortened with `shortLabel`. `strongestIdx` matches the full subject name
 * (never the shortened label) and DEFAULTS TO 0 when no match is found
 * (rule 4 — keep the legacy quirk: the first bar darkens instead).
 */
export function buildChartSeries(
  rows: ChartSeriesRow[],
  classAvg: number[],
  classTop: number[],
  strongestName: string,
  variant: ChartVariant,
): ChartSeries {
  const labels: string[] = [];
  const achieved: number[] = [];
  const avg: number[] = [];
  const top: number[] = [];
  let strongestIdx = 0;
  let matched = false;

  rows.forEach((row, i) => {
    if (row.achieved === null) return; // total == "-" → excluded from the chart
    if (!matched && row.name === strongestName) {
      strongestIdx = labels.length;
      matched = true;
    }
    labels.push(shortLabel(row.name, variant));
    achieved.push(row.achieved);
    avg.push(classAvg[i] ?? 0);
    top.push(classTop[i] ?? 0);
  });

  return { labels, achieved, avg, top, strongestIdx };
}

/* ================================================================
 * Figure layout (prompt Sections 6, 9)
 * ================================================================ */

interface Layout {
  W: number;
  H: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  barW: number;
  xPad: number;
  ymax: number;
  rotation: number;
  tickFs: number; // pt
  achievedFs: number; // pt
  statFs: number; // pt (class avg / class topper value labels)
  legendY: number | null; // axes-fraction below the axes; null → no in-SVG legend
}

function midTermLayout(n: number): Layout {
  // Fixed 3:1 ratio is DELIBERATE (rule 6): a fixed height made 7-subject
  // cards taller than 12-subject cards because the figure grew squarer.
  const figW = Math.max(12.0, n * 1.5);
  const figH = figW / 3.0;
  const rotation = n <= 6 ? 0 : n <= 9 ? 12 : 15;
  return {
    W: figW * 150,
    H: figH * 150,
    left: 0.07,
    right: 0.98,
    top: 0.91,
    bottom: rotation === 0 ? 0.2 : 0.26,
    barW: 0.22, // fixed for all subject counts
    xPad: 0.55,
    ymax: 120,
    rotation,
    tickFs: n <= 7 ? 10 : n <= 10 ? 9 : 8,
    achievedFs: n <= 8 ? 8.5 : 7.5,
    statFs: n <= 8 ? 8.5 : 7.5,
    legendY: rotation === 0 ? -0.18 : -0.24,
  };
}

function terminalLayout(n: number): Layout {
  const figW = Math.max(8.5, Math.min(14.0, n * 0.95)); // capped at 14 inches
  const figH = Math.max(3.8, figW / 2.4); // ~2.4:1, minimum height 3.8
  return {
    W: figW * 150,
    H: figH * 150,
    left: 0.07,
    right: 0.99,
    top: 0.9,
    bottom: 0.36,
    barW: Math.min(0.22, Math.max(0.12, 0.65 / n)), // adaptive
    xPad: 0.55,
    ymax: 115,
    rotation: n > 6 ? 40 : 28,
    tickFs: n > 10 ? 6 : n > 7 ? 7 : 8,
    achievedFs: 7,
    statFs: 6,
    legendY: null, // Terminal renders its legend in HTML, not in the image
  };
}

/* ================================================================
 * SVG generation (prompt Sections 1, 2, 6, 7)
 * ================================================================ */

/** Format a value label the way the card prints totals: 2 dp, trimmed. */
function fmtValue(v: number): string {
  return parseFloat(v.toFixed(2)).toString();
}

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const FONT_STACK = "DejaVu Sans, Helvetica Neue, Helvetica, Arial, sans-serif";

/**
 * `generate_chart_base64()` equivalent: builds the grouped bar chart as a
 * static SVG and returns it as a data URI ready for
 * `<img class="chart-img" src={...}>`. Returns null for an empty series —
 * the template then shows the fallback paragraph instead of a broken image.
 */
export function generateChartImage(series: ChartSeries, variant: ChartVariant): string | null {
  const { labels, achieved, avg, top, strongestIdx } = series;
  if (labels.length === 0) return null; // empty series → fallback paragraph
  const n = labels.length;
  const L = variant === "mid-term" ? midTermLayout(n) : terminalLayout(n);
  const { W, H } = L;

  // Axes box in pixel space (matplotlib subplot margins).
  const plotL = L.left * W;
  const plotR = L.right * W;
  const plotT = (1 - L.top) * H;
  const plotB = (1 - L.bottom) * H;
  const plotW = plotR - plotL;
  const plotH = plotB - plotT;

  // Data → pixel mapping (subject centres at integer x, padded either side).
  const xmin = -L.xPad;
  const xmax = n - 1 + L.xPad;
  const X = (d: number) => plotL + ((d - xmin) / (xmax - xmin)) * plotW;
  const Y = (v: number) => plotB - (v / L.ymax) * plotH;

  const tickLen = 3.5 * PT; // matplotlib major tick size
  const tickW = 0.8 * PT; // spine/tick line width
  const barEdgeW = 1.0 * PT; // patch edge width
  const tickFsPx = L.tickFs * PT;
  const titleFsPx = 12 * PT; // matplotlib default title size

  const p: string[] = [];
  p.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W.toFixed(1)}" height="${H.toFixed(1)}" ` +
      `viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" font-family="${FONT_STACK}">`,
  );
  p.push(`<rect x="0" y="0" width="${W.toFixed(1)}" height="${H.toFixed(1)}" fill="#FFFFFF"/>`);

  // Chart title (hardcoded in both legacy trees).
  p.push(
    `<text x="${((plotL + plotR) / 2).toFixed(1)}" y="${(plotT - 0.55 * titleFsPx).toFixed(1)}" ` +
      `font-size="${titleFsPx.toFixed(1)}" fill="#000000" text-anchor="middle">${esc(CHART_TITLE)}</text>`,
  );

  // ---- Bars + value labels (3 grouped series per subject, prompt §2) ----
  for (let i = 0; i < n; i++) {
    const isStrongest = i === strongestIdx;
    const bars: { cx: number; v: number; fill: string; edge: string; fs: number; bold: boolean }[] = [
      {
        cx: i - L.barW,
        v: achieved[i],
        fill: isStrongest ? COLORS.achievedStrong : COLORS.achieved,
        edge: isStrongest
          ? variant === "mid-term"
            ? COLORS.achievedStrongEdgeMid
            : COLORS.achievedStrong
          : COLORS.achievedEdge,
        fs: L.achievedFs,
        bold: true,
      },
      { cx: i, v: avg[i], fill: COLORS.avg, edge: COLORS.avgEdge, fs: L.statFs, bold: false },
      { cx: i + L.barW, v: top[i], fill: COLORS.top, edge: COLORS.topEdge, fs: L.statFs, bold: false },
    ];
    for (const b of bars) {
      const x0 = X(b.cx - L.barW / 2);
      const x1 = X(b.cx + L.barW / 2);
      const y0 = Y(b.v);
      const y1 = Y(0);
      p.push(
        `<rect x="${x0.toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" ` +
          `width="${Math.max(0.5, x1 - x0).toFixed(1)}" height="${Math.max(0, y1 - y0).toFixed(1)}" ` +
          `fill="${b.fill}" stroke="${b.edge}" stroke-width="${barEdgeW.toFixed(1)}"/>`,
      );
      // Bars with height 0 or less are skipped — no label printed above them.
      if (b.v > 0) {
        p.push(
          `<text x="${X(b.cx).toFixed(1)}" y="${Y(b.v + 1.5).toFixed(1)}" ` +
            `font-size="${(b.fs * PT).toFixed(1)}"${b.bold ? ' font-weight="bold"' : ""} ` +
            `fill="${COLORS.label}" text-anchor="middle">${esc(fmtValue(b.v))}</text>`,
        );
      }
    }
  }

  // ---- Axes box (matplotlib draws all four spines) ----
  p.push(
    `<rect x="${plotL.toFixed(1)}" y="${plotT.toFixed(1)}" width="${plotW.toFixed(1)}" ` +
      `height="${plotH.toFixed(1)}" fill="none" stroke="${COLORS.spine}" stroke-width="${tickW.toFixed(1)}"/>`,
  );

  // ---- Y axis: ticks 0/25/50/75/100, tick labels, axis label ----
  for (const v of [0, 25, 50, 75, 100]) {
    const y = Y(v);
    p.push(
      `<line x1="${plotL.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(plotL - tickLen).toFixed(1)}" ` +
        `y2="${y.toFixed(1)}" stroke="${COLORS.spine}" stroke-width="${tickW.toFixed(1)}"/>`,
    );
    p.push(
      `<text x="${(plotL - tickLen - 4).toFixed(1)}" y="${(y + 0.35 * tickFsPx).toFixed(1)}" ` +
        `font-size="${tickFsPx.toFixed(1)}" fill="#000000" text-anchor="end">${v}</text>`,
    );
  }
  const yLabelX = plotL - tickLen - 6 - 1.8 * tickFsPx;
  const yLabelY = (plotT + plotB) / 2;
  p.push(
    `<text x="${yLabelX.toFixed(1)}" y="${yLabelY.toFixed(1)}" font-size="${tickFsPx.toFixed(1)}" ` +
      `fill="#000000" text-anchor="middle" transform="rotate(-90 ${yLabelX.toFixed(1)} ${yLabelY.toFixed(1)})">${esc(Y_AXIS_LABEL)}</text>`,
  );

  // ---- X axis: subject ticks, shortened labels (adaptive rotation), axis label ----
  const maxLabelLen = Math.max(...labels.map((l) => l.length));
  const labelDrop =
    L.rotation === 0 ? 0 : maxLabelLen * 0.58 * tickFsPx * Math.sin((L.rotation * Math.PI) / 180);
  for (let i = 0; i < n; i++) {
    const x = X(i);
    p.push(
      `<line x1="${x.toFixed(1)}" y1="${plotB.toFixed(1)}" x2="${x.toFixed(1)}" ` +
        `y2="${(plotB + tickLen).toFixed(1)}" stroke="${COLORS.spine}" stroke-width="${tickW.toFixed(1)}"/>`,
    );
    if (L.rotation === 0) {
      p.push(
        `<text x="${x.toFixed(1)}" y="${(plotB + tickLen + 4 + 0.85 * tickFsPx).toFixed(1)}" ` +
          `font-size="${tickFsPx.toFixed(1)}" fill="#000000" text-anchor="middle">${esc(labels[i])}</text>`,
      );
    } else {
      // Right-aligned slanted labels, anchored just below the tick.
      const ax = x + 0.35 * tickFsPx;
      const ay = plotB + tickLen + 4 + 0.4 * tickFsPx;
      p.push(
        `<text x="${ax.toFixed(1)}" y="${ay.toFixed(1)}" font-size="${tickFsPx.toFixed(1)}" ` +
          `fill="#000000" text-anchor="end" transform="rotate(${L.rotation} ${ax.toFixed(1)} ${ay.toFixed(1)})">${esc(labels[i])}</text>`,
      );
    }
  }
  const xLabelY = plotB + tickLen + 4 + 0.4 * tickFsPx + labelDrop + 1.4 * tickFsPx;
  p.push(
    `<text x="${((plotL + plotR) / 2).toFixed(1)}" y="${xLabelY.toFixed(1)}" ` +
      `font-size="${tickFsPx.toFixed(1)}" fill="#000000" text-anchor="middle">${esc(X_AXIS_LABEL)}</text>`,
  );

  // ---- Legend (Mid-Term only: below the chart, centred, 3 columns, no
  //      frame). Terminal cards render their legend in HTML instead
  //      (prompt §8/§9). ----
  if (L.legendY !== null) {
    const entries = [
      { text: "Achieved Marks", fill: COLORS.achieved, edge: COLORS.achievedEdge },
      { text: "Class Avg", fill: COLORS.avg, edge: COLORS.avgEdge },
      { text: "Class Topper", fill: COLORS.top, edge: COLORS.topEdge },
    ];
    const swatchW = 1.6 * tickFsPx;
    const swatchH = 0.7 * tickFsPx;
    const inGap = 0.5 * tickFsPx;
    const entryGap = 1.6 * tickFsPx;
    const rowH = 1.5 * tickFsPx;
    const legendTop = plotB + Math.abs(L.legendY) * plotH;
    const totalW =
      entries.reduce((a, e) => a + swatchW + inGap + e.text.length * 0.6 * tickFsPx, 0) +
      entryGap * (entries.length - 1);
    let cx = (W - totalW) / 2;
    for (const e of entries) {
      p.push(
        `<rect x="${cx.toFixed(1)}" y="${(legendTop + (rowH - swatchH) / 2).toFixed(1)}" ` +
          `width="${swatchW.toFixed(1)}" height="${swatchH.toFixed(1)}" fill="${e.fill}" ` +
          `stroke="${e.edge}" stroke-width="${barEdgeW.toFixed(1)}"/>`,
      );
      p.push(
        `<text x="${(cx + swatchW + inGap).toFixed(1)}" y="${(legendTop + rowH * 0.76).toFixed(1)}" ` +
          `font-size="${tickFsPx.toFixed(1)}" fill="#000000" text-anchor="start">${e.text}</text>`,
      );
      cx += swatchW + inGap + e.text.length * 0.6 * tickFsPx + entryGap;
    }
  }

  p.push("</svg>");
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.join(""))}`;
}
