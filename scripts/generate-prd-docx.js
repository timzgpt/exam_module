/**
 * PRD generator: "Real Backend Data Integration" for Josephian Schools.
 *
 * Skill compliance (docx skill):
 * - Cover: Recipe R1 (Pure Paragraph Left), palette GO-1 (PRD routing per
 *   design-system.md; long title override R4 -> R1, same palette).
 * - 3-section architecture: cover (no page number) / front matter (Roman) /
 *   body (Arabic, start 1). TOC via TableOfContents + refresh hint.
 * - Fonts: Profile A English (Times New Roman body, SimHei eastAsia headings).
 * - Tables: Horizontal-Only business style with GO-1 table tokens.
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, SectionType, TableOfContents,
  TableLayoutType, PageBreak,
} = require("docx");
const fs = require("fs");

// ---------------------------------------------------------------- palette
const GO1 = {
  bg: "1A2330", primary: "FFFFFF", accent: "D4875A",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "D4875A", headerText: "FFFFFF", accentLine: "D4875A", innerLine: "DDD0C8", surface: "F8F0EB" },
};
const P = GO1;
const BODY = "000000";
const EN = "Times New Roman";
const HEAD_FONT = { ascii: "Times New Roman", eastAsia: "SimHei" };

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function safeText(value, placeholder) {
  if (value === undefined || value === null || value === "" ||
      String(value) === "NaN" || String(value) === "undefined") {
    return placeholder || "[to be completed]";
  }
  return String(value);
}

// ------------------------------------------------------- cover machinery
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."，。、；：！？", ..."的与和及之在于为", ..."-_—–·/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

// Latin-aware text width (common-rules Rule 3): CJK chars are ~pt*20 twips,
// Latin chars ~pt*10. The title here is pure English, so measure per-script.
function textWidthTwips(text, pt) {
  let w = 0;
  for (const ch of text) w += /[\u2e80-\u9fff\uff00-\uffef]/.test(ch) ? pt * 20 : pt * 10;
  return w;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // Approximate chars-per-line from average width of this title's own script.
  const avgChar = (pt) => textWidthTwips(title, pt) / title.length;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / avgChar(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight +
                        metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

function buildCoverR1(config) {
  const PC = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: PC.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: PC.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: PC.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: PC.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: PC.cover.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: safeText(line), size: 24, color: PC.cover.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: PC.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: safeText(config.footerLeft, ""), size: 16, color: PC.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: safeText(config.footerRight, ""), size: 16, color: PC.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: PC.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ----------------------------------------------------------- body helpers
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 380, lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 32, color: "1A2330", font: HEAD_FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 340, lineRule: "atLeast" },
    children: [new TextRun({ text, bold: true, size: 28, color: "1A2330", font: HEAD_FONT })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after ?? 120 },
    children: [new TextRun({ text, size: 24, color: BODY, font: { ascii: EN, eastAsia: "SimSun" } })],
  });
}
function bodyRuns(runs, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: opts.after ?? 120 },
    children: runs.map(r => new TextRun({ size: 24, color: BODY, font: { ascii: EN, eastAsia: "SimSun" }, ...r })),
  });
}
function labeled(label, text) {
  return bodyRuns([{ text: label + " ", bold: true }, { text }]);
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: BODY, font: { ascii: EN, eastAsia: "SimSun" } })],
  });
}
function caption(text) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 160, after: 80, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: "404040", font: { ascii: EN, eastAsia: "SimSun" } })],
  });
}
function cell(text, { header = false, width, fill } = {}) {
  return new TableCell({
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: header
      ? { type: ShadingType.CLEAR, fill: P.table.headerBg }
      : (fill ? { type: ShadingType.CLEAR, fill } : undefined),
    children: [new Paragraph({
      spacing: { line: 276 },
      children: [new TextRun({
        text: safeText(text), size: 21, bold: header,
        color: header ? P.table.headerText : "202020",
        font: { ascii: EN, eastAsia: "SimSun" },
      })],
    })],
  });
}
function bizTable(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((t, i) => cell(t, { header: true, width: widths[i] })),
      }),
      ...rows.map(r => new TableRow({
        cantSplit: true,
        children: r.map((t, i) => cell(t, { width: widths[i] })),
      })),
    ],
  });
}

// ------------------------------------------------------------ body content
const bodyChildren = [];
const push = (...els) => bodyChildren.push(...els);

// 1 Executive Summary
push(h1("1. Executive Summary"));
push(body("We are building a real data layer behind the existing Josephian Schools Exams and Report Cards module for the academic master, class teachers and parents, so that the school stops operating on demonstration data and starts using the module as its system of record. The module already delivers 23 working pages (exams administration, grading schemes, the full report-cycle workflow from marks entry to release, a parent portal and public verification) on top of a centralised demo configuration. The only missing layer is persistence: every mark, comment, approval and report card currently comes from deterministic demo fixtures."));
push(body("This document defines the problem, the users, the scope of the data-integration release, measurable success criteria and implementation-ready stories. It was produced with the Product-Manager-Skills /prioritize and /write-prd workflows; the prioritization record that selected this initiative over parent-portal polish and analytics expansion is summarised in Section 4."));

// 2 Problem Statement
push(h1("2. Problem Statement"));
push(h2("2.1 Who has this problem"));
push(body("Deo Nsubuga, the academic master of Josephian Schools, is the owner of the reporting cycle. He configures exams, chases marks entry across nine class-subject deadlines per class, writes approvals and releases report cards to 12-plus classes and their parents. His class teachers enter marks in the module; his parents read the result through the portal or the printed sheet."));
push(h2("2.2 Problem framing narrative (problem-statement skill)"));
push(labeled("I am:", "the academic master of a growing Dar es Salaam school, responsible for every terminal report card the school issues, and the person teachers come to when marks or comments go missing."));
push(labeled("Trying to:", "run one trusted reporting cycle per term in which marks are captured once, grades are computed consistently, approvals are recorded and parents receive the correct report the first time."));
push(labeled("But:", "the module I approved shows Form 3A with twelve demo students and fabricated averages. Nothing I enter survives a restart that swaps the data source; none of it is the school's actual record; and I cannot hand parents a portal that displays someone else's child."));
push(labeled("Because:", "the module was built against a demo fixture layer, and the school's real registers live outside the system, so there is no schema, no migration and no write path behind the screens."));
push(labeled("Which makes me feel:", "that the impressive screens are a promise I cannot keep: every hour teachers spend entering real work into a demo is an hour I later have to apologise for."));
push(h2("2.3 Evidence"));
push(bullet("The repository's own configuration documents the gap: src/lib/demo-config.ts states that its identifiers are temporary demonstration values and that Deo will connect real backend data later; every route is generated from that single seam."));
push(bullet("The persistence layer is scaffolded but empty of domain models: prisma/schema.prisma (SQLite) contains only the starter User and Post models, while src/lib/demo-data.ts generates students, marks, comments, deadlines and approvals in code."));
push(bullet("The parent portal and the public /verify page already render whatever the data layer returns, which makes real-data integration a correctness prerequisite before any parent-facing release, not an enhancement."));
push(h2("2.4 Final problem statement"));
push(bodyRuns([
  { text: "The academic master needs a way to " },
  { text: "run the reporting cycle on the school's real records", italics: true },
  { text: " because the module currently serves deterministic demo data with no write path, which makes every entered mark disposable and blocks any parent-facing release." },
]));

// 3 Personas
push(h1("3. Target Users and Personas"));
push(body("Proto-personas below follow the kit's proto-persona format. They are role-based and grounded in the module's own navigation model; they have not yet been validated by interviews, which is flagged in the self-assessment (Section 11)."));
push(caption("Table 1: Proto-personas for the data-integration release"));
push(bizTable(
  ["Persona", "Role and context", "Goals", "Pains today", "What changes for them"],
  [
    ["Academic-Master Deo (primary)", "Owner of the reporting cycle; single module power user; comfortable with spreadsheets and keyboard-first data entry.",
     "One trusted source of truth; cycle completes before term end; audit trail he can defend.",
     "Cannot keep entered data; cannot release real reports; fears a parent seeing demo data.",
     "Every screen reads and writes the school database; approvals and releases become real records."],
    ["Teacher Tumaini (secondary)", "Class teacher for Form 3A; enters marks and comments per subject; low tolerance for new process.",
     "Enter marks once, quickly, from the class register; see grades appear correctly.",
     "Any entry today is throwaway; no confidence the sheet will persist.",
     "Marks entry saves to the database with live grade feedback and drafts survive the session."],
    ["Parent Neema (tertiary)", "Parent of a Form 3A student; checks the portal on a phone; non-technical.",
     "See her child's correct terminal report and book a parents-day slot.",
     "Portal currently shows demo students, so it is unusable as a source of truth.",
     "Portal reads only her child's real records; verification codes resolve against real issues."],
  ],
  [16, 26, 20, 19, 19]
));

// 4 Strategic context
push(h1("4. Strategic Context and Why Now"));
push(body("The /prioritize run scored three candidate initiatives for the coming term under the prioritization-advisor's recommendation (ICE scoring plus a value-versus-effort reading, chosen because the team is one developer and there is no production usage data for RICE reach estimates). Acquisition-channel and pricing steps of the workflow were assessed and recorded as not material for an internal school deployment."));
push(caption("Table 2: Prioritization record (ICE: impact x confidence x ease)"));
push(bizTable(
  ["Initiative", "Revenue connection (kit taxonomy)", "I", "C", "E", "ICE", "Quadrant"],
  [
    ["Real backend data integration", "Enabler: contract deliverable; strategic value (option 5 path)", "3", "85%", "2", "5.1", "High value, high effort"],
    ["Parent portal polish", "Retention of parent engagement (option 2 path)", "2", "75%", "4", "6.0", "High value, low effort"],
    ["Analytics expansion", "No direct revenue; strategic for leadership (option 5)", "2", "60%", "3", "3.6", "Medium value, medium effort"],
  ],
  [24, 30, 6, 9, 6, 9, 16]
));
push(body("The raw ICE ranking favours portal polish, but the workflow's own checkpoints flip the order, and two facts do. First, reversibility: data-model decisions are the only irreversible ones on the list, and they are the cheapest to get wrong expensively later. Second, dependency: the parent portal currently renders demo students to whoever opens it; polishing a portal that shows someone else's child to real parents is actively harmful, and analytics on demo data is equally hollow. Portal polish and analytics expansion are therefore blocked by this initiative, not merely outranked by it. Confidence in the number-one ranking is high; the ranking would flip only if the school's existing registers turn out to be unavailable in digital form, in which case the fallback in Section 9 applies."));

// 5 Solution overview
push(h1("5. Solution Overview"));
push(body("We are not rebuilding screens. The 23 pages, their routes and the design system stay exactly as they are. We are replacing what sits behind them: a real data layer for the academic domain, exposed through the same function signatures the pages already call, so the demo fixture layer becomes a swappable implementation behind one seam."));
push(body("The work has four layers. One: model the domain in Prisma (academic years, report cycles, classes, students, subjects, teaching assignments, marks, grading schemes, comments, approvals, batches, release records, verification codes, parents-day slots and holds), and migrate the SQLite database. Two: implement a data-access layer whose exported functions mirror today's demo-data API, so imports change once instead of everywhere. Three: switch the navigation context from the hardcoded demo identifiers (cycle cy1, class 01a1a064-..., student st1 in src/lib/demo-config.ts) to real selected records, keeping the resolveHref template mechanism unchanged. Four: add authentication and role gates so academic master, class teacher and parent see the permissions they already have in the UI, enforced server-side this time."));
push(body("Demo mode is retained as an explicit configuration switch for training and sales demonstrations; it is never the default and never serves real students. This keeps the documented promise in demo-config.ts: replacing the demo values with real identifiers requires no redesign of the navigation."));
push(h2("5.1 What stays fixed"));
push(bullet("All 23 routes and their URL shapes, including dynamic segments for cycle, class and student."));
push(bullet("The design system: burgundy token theme, collapsible sidebar, and the passing ux-ui-agent-skills gate suite (zero hardcoded values, WCAG-passing token source, no overflow at 390 and 280 pixels)."));
push(bullet("Business logic already built: grading computation, readiness checks, review and approval flow, batch generation, release management and verification checksums."));

// 6 Success metrics
push(h1("6. Success Metrics"));
push(body("Success is defined by data truthfulness first, then by preserved behaviour, then by performance. Metrics are measurable from the repository and the running system, not from surveys."));
push(caption("Table 3: Success metrics for the release"));
push(bizTable(
  ["Tier", "Metric", "Current", "Target", "Measured by"],
  [
    ["Primary", "Share of module pages serving real school data", "0% (demo fixtures)", "100% for all 23 pages by term end", "Code audit: no page imports demo-data at release"],
    ["Secondary", "Marks entry save latency (per cell commit)", "Not applicable (no writes)", "Under 1 second, 95th percentile locally", "Instrumented save handler"],
    ["Secondary", "Report-card batch generation, one class of 12", "Instant (fixtures)", "Under 30 seconds end to end", "Batch run timing log"],
    ["Secondary", "Public verification of an issued code", "Demo codes only", "Every issued code resolves with correct checksum", "Verify flow test"],
    ["Guardrail", "Route stability", "23 routes", "23 routes, zero URL changes", "Link and navigation audit"],
    ["Guardrail", "Design gates", "All green", "Stay green after the change", "Kit gate suite rerun"],
    ["Guardrail", "Demo mode", "Default", "Opt-in only, flagged screens, no real records", "Config and code review"],
  ],
  [12, 34, 17, 22, 15]
));

// 7 Stories
push(h1("7. User Stories and Requirements"));
push(h2("7.1 Epic hypothesis"));
push(body("We believe that connecting the existing 23-page module to a real school database behind the current demo configuration seam will make the module the school's system of record this term, because the screens, workflows and business logic are already built and the only missing layer is persistence. We will measure success by the primary metric in Section 6 within 30 days of cutover."));
push(h2("7.2 Story split (user-story and user-story-splitting skills)"));
push(body("The epic splits along Pattern 1 (workflow steps) and Pattern 6 (external dependency boundary): the schema must exist before the access layer; the access layer before the context switch; the context switch before role enforcement. Each story below ships user-visible value on its own slice."));
push(caption("Table 4: Story map for the epic"));
push(bizTable(
  ["Story", "Slice (kit split pattern)", "Depends on"],
  [
    ["S1 Domain schema", "Data foundation (Pattern 5: major effort milestone)", "-"],
    ["S2 Data access layer", "Same signatures behind the seam (Pattern 6: boundary)", "S1"],
    ["S3 Context switch", "Navigation context from real records (Pattern 1: workflow step)", "S2"],
    ["S4 Marks entry persistence", "First real write path (Pattern 1: workflow step)", "S2, S3"],
    ["S5 Reports and verification", "Generation and codes from real data (Pattern 1)", "S4"],
    ["S6 Roles and access", "Server-side enforcement (Pattern 2: business rule variations)", "S3"],
  ],
  [22, 56, 22]
));
push(h2("7.3 Story S1: Model the academic domain"));
push(bodyRuns([{ text: "As " }, { text: "the academic master", italics: true }, { text: ", I want the school's classes, students, subjects, cycles and marks stored in the module's database, so that the data I see is the data the school keeps." }]));
push(body("Acceptance criteria (Gherkin):"));
push(bullet("Scenario: schema covers the module. Given the migrated database, when the access layer queries each domain entity used by the 23 pages, then every query resolves without falling back to demo fixtures."));
push(bullet("Scenario: a term is representable. Given a new academic year, when I create a report cycle for Term 1 with start and end dates, then the cycle appears in the cycle selector on every context-aware page."));
push(bullet("Scenario: grading scheme is data. Given a grading scheme with boundaries A to F, when marks are stored, then boundaries are read from the database, not from code constants, and changing a boundary changes computed grades on recompute."));
push(h2("7.4 Story S2: Data access layer behind the existing seam"));
push(bodyRuns([{ text: "As " }, { text: "the developer", italics: true }, { text: ", I want a data-access layer whose exported functions mirror the demo-data API, so that pages switch source without route or markup changes." }]));
push(body("Acceptance criteria:"));
push(bullet("Scenario: signature parity. Given the function list exported by src/lib/demo-data.ts, when the access layer is implemented, then every consumer compiles against the new module with no signature changes."));
push(bullet("Scenario: demo switch. Given the configuration flag, when demo mode is enabled, then pages render fixtures exactly as today; when disabled, the same pages resolve only real records."));
push(bullet("Scenario: no silent demo. Given demo mode disabled, when a query returns no record, then the UI shows an empty state, never a demo row."));
push(h2("7.5 Story S3: Context from real selections"));
push(bodyRuns([{ text: "As " }, { text: "the academic master", italics: true }, { text: ", I want the cycle, class and student context to come from my actual selections, so that navigating the module always shows the records I chose." }]));
push(body("Acceptance criteria:"));
push(bullet("Scenario: selector drives navigation. Given the header cycle and class selectors, when I pick Term 1 2026 and Form 3B, then every context-aware link resolves to that cycle and class via the existing resolveHref templates."));
push(bullet("Scenario: deep links keep working. Given a bookmarked URL with real identifiers, when I open it directly, then the page resolves that record; unknown identifiers render the existing empty state instead of crashing."));
push(h2("7.6 Story S4: Marks entry persists"));
push(bodyRuns([{ text: "As " }, { text: "a class teacher", italics: true }, { text: ", I want my marks saved as I type and survive the session, so that entering a class of results is work done once." }]));
push(body("Acceptance criteria:"));
push(bullet("Scenario: save and recompute. Given marks entry for Mathematics in Form 3A, when I commit a mark of 91 for a student, then the value persists, the grade pill recomputes from the scheme and the class statistics update."));
push(bullet("Scenario: draft survival. Given unsaved edits, when the page is reloaded or the session drops, then committed marks persist and uncommitted drafts are recoverable or clearly discarded, never silently lost."));
push(bullet("Scenario: concurrent entry. Given two teachers entering the same class-subject, when both commit, then the second write is rejected with a clear message instead of overwriting the first."));
push(h2("7.7 Story S5: Reports and verification from real data"));
push(bodyRuns([{ text: "As " }, { text: "the academic master", italics: true }, { text: ", I want report cards, batches, release and verification codes computed from real records, so that what a parent receives is defensible." }]));
push(body("Acceptance criteria:"));
push(bullet("Scenario: print matches data. Given a student with real marks, when I preview or print the report card, then every figure on the sheet equals the stored record and the sheet shows the real verification code."));
push(bullet("Scenario: verification resolves. Given an issued report code, when anyone enters it on /verify, then the page confirms issue date and checksum from the database; a fabricated code returns not found."));
push(h2("7.8 Story S6: Roles enforced server-side"));
push(bodyRuns([{ text: "As " }, { text: "a parent", italics: true }, { text: ", I want the portal to show only my child's records, so that the school's data stays private." }]));
push(body("Acceptance criteria:"));
push(bullet("Scenario: parent scope. Given a signed-in parent, when any portal API is called, then only records for that parent's children are returned, regardless of client-side navigation."));
push(bullet("Scenario: teacher scope. Given a class teacher, when marks entry opens, then writable subjects are the ones assigned to that teacher; the academic master retains cycle-wide rights."));
push(bullet("Scenario: demo protection. Given demo mode enabled on a training instance, when a user attempts a write, then the write is refused or sandboxed and no real record is touched."));

// 8 Out of scope
push(h1("8. Out of Scope"));
push(body("The release deliberately excludes the following, each recorded with its reason so scope debates end here rather than in the sprint."));
push(bullet("Parent portal polish and visual changes: blocked-by design; scheduled immediately after this release and before the parent-facing announcement."));
push(bullet("Analytics expansion beyond today's dashboard: deferred until leadership names the specific reports they act on; no demand signal exists yet."));
push(bullet("SMS or email notification delivery: the notification feed stays in-app; delivery channels need a provider decision that is out of scope."));
push(bullet("Multi-school tenancy: the school operates as one deployment; the schema notes the extension point but does not implement it (see Section 10)."));
push(bullet("Mobile-native applications: the module is responsive and stays web-only."));

// 9 Dependencies and risks
push(h1("9. Dependencies and Risks"));
push(caption("Table 5: Risks and mitigations"));
push(bizTable(
  ["Risk", "Likelihood", "Impact", "Mitigation"],
  [
    ["Existing school registers are not available in digital, importable form", "Medium", "High",
     "One-day spike before sprint 1 maps register sources; fallback is a one-off assisted import (CSV per class) plus manual entry through the module, re-sequenced before S4."],
    ["Schema drift against the types the UI already consumes", "Medium", "Medium",
     "The access layer owns translation; types.ts remains the contract; a mismatch fails compile, not runtime."],
    ["Authentication scope creep delaying go-live", "High", "Medium",
     "S6 ships with the platform's existing session mechanism and three roles only; password reset and directory integration are follow-ups."],
    ["Single-developer bus factor across a term-long epic", "Medium", "Medium",
     "Stories are sequenced to ship value independently; schema and access layer land first so later work is additive."],
    ["SQLite ceiling under school-wide concurrent writes", "Low", "Low",
     "Access layer isolates the engine; the documented Postgres migration path stays available without page changes."],
  ],
  [30, 12, 10, 48]
));
push(body("Dependencies: design is not blocking (no visual change); the module's own business logic and tests provide the verification harness; the school register spike (above) is the only external dependency."));

// 10 Open questions
push(h1("10. Open Questions"));
push(bullet("[Open Question] Which system currently holds the authoritative class registers, and can it export per-class CSV? Determines whether the fallback import in Section 9 is needed."));
push(bullet("[Open Question] Is single-school tenancy a permanent product decision, or must the schema carry a school identifier from day one for a future multi-campus rollout?"));
push(bullet("[Open Question] Do grading schemes ever change mid-cycle, and if so must historical report cards preserve the scheme in force at issue time?"));
push(bullet("[Open Question] What are the school's backup and retention expectations for student records, and who owns them?"));
push(bullet("[Assumption] The term deadline forces go-live before the next reporting cycle; if the calendar slips, portal polish re-enters the term's scope first."));

// 11 Self-assessment
push(h1("11. Self-Assessment"));
push(body("Strongest section: the solution overview and its seam strategy, because it is grounded in the repository's actual structure (centralised demo configuration, function-signature parity, route templates) rather than in aspiration; the guardrail metrics make regression observable."));
push(body("Weakest section: the personas. They are role-based proto-personas derived from the module's navigation model and the configuration file; no teacher or parent interview has been conducted yet. The risk is mis-sized effort on marks-entry ergonomics."));
push(body("Top assumptions to validate: (1) the school's registers are digitally importable within the term; (2) single-school tenancy holds for at least two years; (3) the go-live deadline precedes the next reporting cycle."));
push(body("Recommended next step: run the one-day schema-mapping spike (register sources versus the domain model in Story S1) and one 30-minute marks-entry shadowing session with a class teacher, then re-confirm this document before sprint 1."));

// -------------------------------------------------------------- assembly
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: { ascii: EN } })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: "D0D0D0", space: 4 } },
      children: [new TextRun({ text: "PRD: Real Backend Data Integration | Josephian Schools", size: 18, color: "808080", font: { ascii: EN } })],
    })],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: EN, eastAsia: "SimSun" }, size: 24, color: BODY },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: HEAD_FONT, size: 32, bold: true, color: "1A2330" },
        paragraph: { spacing: { before: 360, after: 160, line: 380 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: HEAD_FONT, size: 28, bold: true, color: "1A2330" },
        paragraph: { spacing: { before: 240, after: 120, line: 340 }, outlineLevel: 1 },
      },
      heading3: {
        run: { font: HEAD_FONT, size: 24, bold: true, color: "1A2330" },
        paragraph: { spacing: { before: 200, after: 100, line: 312 }, outlineLevel: 2 },
      },
    },
  },
  sections: [
    { // Section 1: cover, no page number, no footer
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "Real Backend Data Integration",
        subtitle: "Product Requirements Document: Exams and Report Cards Module",
        englishLabel: "JOSEPHIAN SCHOOLS",
        metaLines: [
          "Prepared for: Deo Nsubuga, Academic Master",
          "Author: Product team, with the PM Skills /write-prd workflow",
          "Date: 4 November 2026",
          "Status: Draft for review",
        ],
        footerLeft: "Josephian Schools, Mbezi Beach, Dar es Salaam",
        footerRight: "Internal",
        palette: P,
      }),
    },
    { // Section 2: front matter, Roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: HEAD_FONT, color: "1A2330" })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888", font: { ascii: EN },
          })],
        }),
      ],
    },
    { // Section 3: body, Arabic from 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: docHeader() },
      footers: { default: pageFooter() },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/z/my-project/download/Josephian-PRD-Backend-Data-Integration.docx", buf);
  console.log("written:", buf.length, "bytes");
});
