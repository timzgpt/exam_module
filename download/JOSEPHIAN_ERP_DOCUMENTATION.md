# Josephian Schools ERP — Exams & Report Cards Module

**Project documentation · Version 2026-11-06 · Runtime: bun + Next.js 16**

> Guiding principle: **One school reporting system, multiple class-specific report templates, and one consistent administrative experience.**

---

## Table of contents

1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Getting started](#3-getting-started)
4. [Repository layout](#4-repository-layout)
5. [Data model & demo data](#5-data-model--demo-data)
6. [Academic domains & business rules](#6-academic-domains--business-rules)
7. [Report template system (multi-school)](#7-report-template-system-multi-school)
8. [Template analysis matrix](#8-template-analysis-matrix)
9. [Screens & routes map](#9-screens--routes-map)
10. [Print & PDF export system](#10-print--pdf-export-system)
11. [Performance chart engine](#11-performance-chart-engine)
12. [Verification & QA workflow](#12-verification--qa-workflow)
13. [Changelog](#13-changelog)
14. [Known limitations & next steps](#14-known-limitations--next-steps)

---

## 1. Overview

This repository implements the **Exams & Report Cards** module of the Josephian Schools ERP as a standalone Next.js web application. It covers the full academic reporting workflow:

- **Exams** — sitting schedules, statuses (draft → ongoing → completed).
- **Report cycles** — the term windows for which report cards are produced (Monthly, Mid-Term, Terminal, Annual), with configurable exam combinations and weights.
- **Marks entry & deadlines** — per class × subject grids with status codes and completion tracking.
- **Comments entry** — class teacher's comments and parental-involvement comments, per student, with completion tracking.
- **Readiness → Review → Release** — per-class approval workflow with audit trail, batch card generation and release holds.
- **Report cards** — a **multi-template engine**: Early Years (Baby Class A/B, KG1, KG2, KG3) observation/competency cards, the Primary marks card and the Secondary NECTA card. Every learner automatically receives the card of their school section and class.
- **Parent portal** — released report cards, progress overview and Parents' Day booking.
- **Print/PDF** — every template prints to A4 with its own layout, no editor chrome, no broken rows.

All learner names, marks, comments, benchmarks and signatures in the running app are **fake demo data** (deterministically seeded). No real child data may enter the code, seeds or tests.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix primitives), tw-animate-css |
| State | Zustand 5 with `persist` (localStorage) — app context `josephian-context`, templates `josephian-report-templates`, nursery assessments `josephian-nursery-assessments` |
| Data | TypeScript demo dataset (`src/lib/demo-data.ts`, `src/lib/nursery.ts`); Prisma 6 + SQLite scaffold present (`prisma/schema.prisma`, `db/custom.db`) |
| Charts | In-house deterministic chart builder (`src/lib/chart/performance-chart.ts`) |
| Fonts | Geist Sans / Geist Mono via `next/font`; report cards use the serif stack for print identity |
| Runtime | bun (dev, test scripts, tsc/eslint gates) |
| i18n scaffold | next-intl (present; staff screens are English-only) |

---

## 3. Getting started

```bash
bun install                 # dependencies

# .env (only key needed):
# DATABASE_URL="file:./db/custom.db"

bun run dev                 # next dev -p 3000  (logs → dev.log)
bun run build               # next build + standalone static/public copy
bun run start               # bun .next/standalone/server.js

bun run db:push | db:generate | db:migrate | db:reset   # Prisma scaffold
```

Useful checks:

```bash
bun scripts/check-performance-chart.ts   # chart rule regression check
bunx tsc --noEmit                        # type gate (0 errors expected in src/)
bunx eslint <changed files>              # lint gate
```

The dev server runs at `http://localhost:3000`. A live preview of this build is deployed at `https://preview-4c46ba5c.space-z.ai/`.

---

## 4. Repository layout

```
├─ src/
│  ├─ app/
│  │  ├─ (app)/academic/                  # staff screens (see §9)
│  │  │  ├─ exams/ · grading-schemes/ · classes/[classId]/subjects/
│  │  │  ├─ report-cycles/                # cycle list
│  │  │  ├─ report-cycles/[cycleId]/      # dashboard, deadlines, departments,
│  │  │  │                                # readiness, review, release, batches,
│  │  │  │                                # parents-day, public-summary
│  │  │  │  └─ classes/[classId]/        # marks · comments · results · targets
│  │  │  │  └─ students/[studentId]/report-card/   # printable card (staff)
│  │  │  └─ report-templates/             # template admin (§7.4)
│  │  ├─ (app)/portal/                    # parent screens: report-cards (+on-hold),
│  │  │                                   # progress, parents-day
│  │  └─ api/                             # minimal API route scaffold
│  ├─ components/features/
│  │  ├─ nursery-reports/                 # nursery-report-card.tsx (renderer),
│  │  │                                   # nursery-assessment-entry.tsx (teacher entry)
│  │  ├─ report-card/card-chrome.ts       # shared print chrome constants
│  │  ├─ parent-reports/                  # portal report-card view
│  │  ├─ report-cycles/ · cycle-analytics/ · cycle-readiness/
│  │  ├─ approvals-release/ · results-targets/
│  ├─ hooks/use-class-template.ts         # template resolution hooks (§7.3)
│  ├─ hooks/use-print-download.ts         # print / download toolbar
│  ├─ lib/
│  │  ├─ types.ts                         # every domain type (§5, §6, §7)
│  │  ├─ demo-data.ts                     # marks-based classes, students, marks, comments
│  │  ├─ nursery.ts                       # Early Years classes, learners, template defaults,
│  │  │                                   # competency scale, seeded assessments
│  │  ├─ report-templates.ts              # class → template kind resolution registry
│  │  ├─ template-store.ts                # persisted admin assignments/configs + assessment edits
│  │  ├─ store.ts                         # app context store (cycle/class/student selection)
│  │  ├─ grading.ts                       # grades, subject totals, NECTA division (best-7)
│  │  ├─ attendance.ts                    # A3.8 attendance summary + rating bands
│  │  ├─ chart/performance-chart.ts       # grouped-bar chart builder
│  │  └─ nav.ts                           # sidebar navigation definition
│  └─ app/globals.css                     # design tokens + the 4-layer print CSS (§10)
├─ scripts/                               # verification/QA scripts (chart check, template
│                                         # switch checks, remark rule checks, matrix builder)
├─ prisma/schema.prisma                   # scaffold (User/Post placeholder)
├─ db/custom.db                           # SQLite file used by the scaffold
├─ tests/                                 # runtime build smoke scripts
└─ download/                              # deliverables (docs, analysis matrix)
```

---

## 5. Data model & demo data

### 5.1 Core domain types (`src/lib/types.ts`)

| Type | Purpose |
|---|---|
| `Subject`, `ClassSubject` | Subject catalogue and per-class assignment: teacher, core/subsidiary, chart label, periods, exam papers (1–2), CA/Exam weights out of 100 |
| `ClassRoom` | Class with `level`, class teacher, room, and the `noDivision` flag (hides Points + Division even for secondary) |
| `Student` | id, classId, name, admission no (`JS/2025/xxxx`), gender |
| `Exam`, `ExamSitting` | Exam windows with per-subject sittings (date, start, duration, invigilator, venue); status draft → scheduled → ongoing → completed |
| `GradingScheme`, `GradeBoundary` | Letter bands with min/max/points/remark; `usesPoints` separates NECTA (secondary) from primary schemes |
| `ReportCycle`, `CycleComponent` | The report window: kind, term, year, status pipeline, report/school-opens dates, attendance period, and 1–2 weighted exam components |
| `MarkStatusCode` | `ABS`, `NA`, `NR`, `PENDING`, `DISQ` — typed into mark cells |
| `CommentRecord` | Per student: class teacher comment + **required** parental-involvement comment, draft/submitted |
| `ClassApproval`, `AuditEntry` | Per-class sign-off state with full audit trail |
| `BatchRun`, `ClassRelease` | Card generation runs and per-class release with hold reasons |
| `AttendanceSummary` | A3.8 attendance over the cycle's attendance period |
| `NurseryTemplateConfig`, `NurseryAssessment`, `TemplateLearningArea`, `TemplateBenchmark`, `CompetencyScale`, `TemplateSignature` | The Early Years template system (§7) |

### 5.2 Demo data (`src/lib/demo-data.ts`)

- Marks-based classes across **Primary (Standard/Grade)** and **Secondary (Form 1–4)** with subjects, teachers, CA/Exam weights.
- Demo anchors: `st1` (Form 3A, 8 subjects — terminal & mid-term cycles), `p5a-01` (Standard 5A — primary card).
- Deterministic seeded generators (`hashStr` FNV-1a + `mulberry32`): marks, grades, **4-sentence parental comments**, 4-sentence class-teacher comments, 3-sentence subject comments (terminal/annual only).
- Cycles: `cy1` terminal-style, `cy1m` mid-term style, plus combined-component cycles (e.g. Monthly 25 % + Mid-Term 75 %).

### 5.3 Early Years data (`src/lib/nursery.ts`)

- 4 classes: `cls-baby` (Baby Class), `cls-kg1`, `cls-kg2`, `cls-kg3` — deliberately **outside** the marks-based class list so no marks/deadline/analytics pipeline touches them.
- 8 fake learners per class (`baby-01…08`, `kg1-01…08`, …).
- `DEFAULT_COMPETENCY_SCALE`: **B** Beginner · **D** Developing · **C** Competent · **HC** Highly Competent (editable per class via admin).
- Default learning areas & benchmarks per template kind (all editable at runtime):
  - Baby Class (A & B): 4 developmental areas — Physical, Language, Social-Emotional, Cognitive.
  - KG1: 4 areas — Kindergarten Arithmetic, Early Language & Communication, Creative Arts and Sensory Play, Social Skills.
  - KG2: 5 areas — Arithmetic, Pre-Early Language & Communication, Early Lifeskills (Relations), Creative Art & Sensory Play, Social & Developmental Learning Skills.
  - KG3: 6 areas — Early Numeracy, Early Language & Communication, Early Lifeskills (Relations), Sports Arts & Crafts, Health & Environmental Care, Culture & Religion.
- `seedNurseryAssessment(classId, studentId, cycle)` builds the deterministic base assessment; teacher edits are stored as patches on top (§7.5).

---

## 6. Academic domains & business rules

These are the module's **invariants** — changes must not break them.

### 6.1 Report cycles

- Kinds: `monthly` | `mid-term` | `terminal` | `annual`. Naming convention: `"{Exam} - {year}"` (e.g. "Mid term - 2026").
- A cycle carries **one exam (weight 100)** or **two components** (school combinations: Monthly 25 % + Mid-Term 75 %, Mid-Term + Terminal). The **Annual Exam always runs standalone** — combining it is not allowed.
- Status pipeline: `preparation → marks-entry → review → approved → released`, with per-class approvals (Class Teacher submits, Academic Dean/Principal approve) and a full audit log.
- Card badges print `reportDate` and `schoolOpensDate` from the cycle — never hard-coded in views.
- Attendance period defaults to term start → report date; cards include the A3.8 attendance block.

### 6.2 Chart & engine rules

- The **Mid-Term engine** (also used by Monthly cycles) counts a student with a single assessment at 100 % in class stats and shows the **Best-Improvement** badge on primary cards.
- The **Terminal engine** (also used by Annual) only counts students with **both** components in class stats and never shows the improvement badge.
- Chart: grouped bars **Achieved / Class Average / Class Topper** with an **integer value label on every bar**, wider bars and intra-group gaps (regression-checked by `scripts/check-performance-chart.ts`).

### 6.3 Comments rules

- **Mid-Term and Monthly cards have no subject comments. Terminal and Annual cards do** (three-sentence personalised comments per subject).
- Two separate comment blocks per student: **Class Teacher's Comments** and **parental involvement** (required), each 3–4 sentences.
- Terminology across the module is **"Comments"** (never "Remarks"); the class teacher's row is explicitly labelled.
- There is **no Parents' consultation day row** on report cards (removed by school decision; Parents' Day exists as its own booking screen).

### 6.4 Grading rules

- **Secondary (Form 1–4):** NECTA-style A–F with subject points; Division from the **best-7 points sum** (Division I ceiling 17 points), shown with the gap to Division I.
- **Primary:** A–E scheme, **no points column, no points total, no division**.
- The class flag `noDivision` hides Points and Division strips even for secondary classes.
- Marks accept status codes (`ABS`, `NA`, `NR`, `PENDING`, `DISQ`) in place of numbers; these are excluded from averages.

### 6.5 Attendance rules (knowledge-base A3.8)

- Counted registers only; `late` counts as attended; `excused` stays in the denominator; days with no counted register are shown separately and **never counted as absent**.
- Rate = (present + late) / recorded × 100 at 1 dp; rating text bands (Excellent ≥ 95, Good 90–94.9, Needs improvement 80–89.9, Concern < 80) are configurable. Parents never see notes/reasons.

---

## 7. Report template system (multi-school)

### 7.1 Resolution chain

```
class ──▶ level default (lib/report-templates.ts) ──▶ admin override (persisted store)
   Baby Class ─▶ "baby-class-a" | "baby-class-b"   (administrator's choice)
   KG1 ─▶ "kg1"      KG2 ─▶ "kg2"      KG3 ─▶ "kg3"
   Form 1–4 ─▶ "secondary"             all other classes ─▶ "primary"
```

- `defaultTemplateKindFor(classId)` is **level-driven**; `useTemplateStore.assignments[classId]` carries the administrator's per-class assignment on top.
- Hooks in `src/hooks/use-class-template.ts` are the **only** resolution entry point — every surface (staff card, portal, entry editor, admin page) resolves through them, never through hard-coded levels.
- Assignments are keyed **by class, not by term**, so a template is reused across academic terms without duplicating the design.

### 7.2 The seven template kinds

| Kind | Renders as |
|---|---|
| `baby-class-a` | **Template A — Developmental Assessment**: Area of Development \| Skills/milestones \| Teacher's Comments, with Date of assessment; descriptive observations only, no grades |
| `baby-class-b` | **Template B — Four Developmental Domains**: Developmental Domain \| Benchmark \| Teacher's remarks (one row per benchmark); narrative remarks only |
| `kg1` | KG1 Observation Report: 4 learning areas × benchmarks × teachers' remarks; no grades |
| `kg2` | KG2 Competency Report: 5 learning areas × benchmarks × **B/D/C/HC grade per benchmark** + dedicated **Comments row per learning area** |
| `kg3` | KG3 Competency Report: same as KG2 with **6 learning areas** |
| `primary` | Existing marks-based primary card (subjects, CA/Exam components, totals, A–E grades, performance summary, chart, attendance) |
| `secondary` | Existing NECTA card (points, best-7 Division, subject comments on terminal/annual, chart, attendance) |

Renderer layout components (`nursery-report-card.tsx`): `BabyClassTemplateA` (A), `RemarksTemplate` (B & KG1 — identical 3-column structure, different heading words), `CompetencyTemplate` (KG2 & KG3).

### 7.3 Configuration shape (`NurseryTemplateConfig`)

```ts
{
  kind, classId,
  title,                       // printed in the maroon band, e.g. "KINDERGARTEN 2 TERMINAL REPORT"
  assessmentDateLabel,         // "Date of assessment" (A/B/KG1) | "Assessment period" (KG2/KG3)
  areas: [{ id, name, benchmarks: [{ id, text }] }],
  scale,                       // CompetencyScale for KG2/KG3, null elsewhere
  gradesPerBenchmark,          // true only for KG2/KG3
  areaRemarkLabel,             // per-area remark column (A, B, KG1) — null when not printed
  areaCommentLabel,            // dedicated per-area comment row (KG2/KG3) — null elsewhere
  classTeacherCommentLabel,    // caption of the concluding class-teacher block
  signatures: [{ id, title, name }]   // Class Teacher · Academic Dean · Principal
}
```

### 7.4 Administrative configuration — `/academic/report-templates`

One page provides the whole task §4 surface:

- **Class picker** grouped by school section (Early Years / Primary / Secondary) with the currently assigned template shown as a badge.
- **Template assignment** — Baby Class offers **both A and B** (kept as separate selectable templates, never merged); KG1–KG3 are fixed to their own template; Primary/Secondary show a pointer to the existing marks cards / Grading schemes page.
- **Learning areas & benchmarks editor** — add, rename, reorder (up/down) and remove both areas and benchmarks; changes are per class.
- **Competency scale editor** (KG2/KG3) — code, label, description per level.
- **Comment captions** — per-area remark/comment labels and the class-teacher comment label.
- **Authorizing signature slots** — add/edit/remove; slot 1 is auto-personalised with the class teacher's name on assignment.
- **Reset to defaults** drops the class override; defaults re-apply from the level.

State persists in the `josephian-report-templates` localStorage store (`template-store.ts`). Secondary classes remain on the existing NECTA card; their grade bands live on `/academic/grading-schemes`.

### 7.5 Teacher assessment entry & data separation

- For a nursery class, the cycle's **Marks page** renders `NurseryAssessmentEntry` instead of the marks grid: pick a learner, then enter the **assessment date**, per-area **remarks** (A/B/KG1) or per-benchmark **competency grades + per-area comments** (KG2/KG3), and the concluding **class teacher's comment**. The cycle's Comments page routes nursery classes to the same editor; nursery classes are excluded from subject-deadlines/subjects flows with an explanatory panel linking to Report templates.
- Storage (`NurseryAssessment`, keyed `cycleId|classId|studentId`):
  - `areaRemarks` — one observation text per learning area (Baby A/B, KG1);
  - `benchmarkGrades` — competency code per benchmark (KG2/KG3);
  - `areaComments` — one dedicated comment per learning area (KG2/KG3);
  - `classTeacherComment` — **stored separately**, never mixed with area text;
  - `assessedOn` — the date printed on Template A.
- Grades and remarks are stored **independently**; a learner's record is seeded deterministically per cycle and teacher edits are saved as patches — so **historical cycles stay accessible** unchanged once a new term begins.
- Teachers only ever see the assessment editor for the class's resolved template (gated through the same resolution hooks).

### 7.6 Parent portal

`/portal/report-cards` resolves the child's template kind: Early Years children get the `NurseryReportCard` with the template label printed in the toolbar; Primary/Secondary keep the existing marks card with the release/on-hold gating. The portal toolbar instructs parents to use "Save as PDF" in the print dialog.

---

## 8. Template analysis matrix

Full workbook: **`download/Josephian_Report_Template_Analysis_Matrix.xlsx`** (sheets: *Template Matrix*, *Class Assignment*, *Implementation Map*; built by `scripts/build-template-matrix.py`). Summary:

| Template | Section / classes | Structure | Assessment fields | Grading | Comments | Pagination & print |
|---|---|---|---|---|---|---|
| **A — Developmental Assessment** | Early Years · Baby Class (option 1) | Learner name/class, date of assessment, then *Area of Development \| Skills/milestones \| Teacher's Comments* over 4 developmental areas | Descriptive skills & milestones per area | **None** — observation only | Per-area Teacher's Comments + concluding class teacher's general comment | 3-column bordered table; each area `<tbody>` atomic; signature block `keep-together`; A4 |
| **B — Four Developmental Domains** | Early Years · Baby Class (option 2) | *Developmental Domain \| Benchmark \| Teacher's remarks*, one row per benchmark across the 4 domains | Benchmark rows per domain | **None** — narrative remarks only | Per-domain remarks + class teacher's comments | Row-per-benchmark table, atomic rows; signature block; A4 |
| **KG1 Observation Report** | Early Years · KG1 | 4 learning areas × benchmarks, *Area \| Benchmark \| Teachers' remarks* | Benchmark text per area | **None** — observation-based | Per-area remarks + general class teacher's comment | Same 3-column engine as B; A4 |
| **KG2 Competency Report** | Early Years · KG2 | 5 learning areas × multiple benchmarks, *Area \| Benchmark \| Grade* | Benchmark + individual competency level per row | **B / D / C / HC** scale (configurable), legend printed | Dedicated **Comments row per learning area** + concluding class teacher's comment | Grade column 11 %; area comment row atomic; scale legend; signature block; A4 |
| **KG3 Competency Report** | Early Years · KG3 | 6 learning areas × benchmarks (areas/benchmarks/periods may vary per term's curriculum) | Benchmark + competency level per row | **B / D / C / HC** | Per-area comments + class teacher's comment | Same engine as KG2; A4 |
| **Primary report template** | Primary · Standard/Grade classes | Existing marks card: header, summary cards, attendance, results table (components → total → grade), performance chart, grade scale | CA/Exam components per subject, totals | **A–E**, no points/division | Class teacher's + parental comments (subject comments only on terminal/annual) | Per-subject `<tbody>` atomic; chart image; signature block; A4 |
| **Secondary report template** | Secondary · Form 1–4 | Existing NECTA card: summary cards (Average, Division, Top Subject, Subjects Taken), attendance, results table with Points, chart, division scale | CA/Exam components, total, grade, points | **A–F NECTA points**, best-7 **Division I–IV/0** | As primary, plus per-subject comments on terminal/annual | Same atomic-tbody pagination; A4 |

Notes:

- Template A–E rows were built from the task's written structure specifications — the six named sample files (`Raylynn Rajab…`, `KWAME-WILLIAM…`, `BRANDON…`, `IVY LOREN…`, `BRYSTON…`, `_JOLENE BRIGHT PROTAS.xlsx`) were **not present in the session's upload folder**. The shipped defaults therefore carry invented benchmark wording that administrators enter/replace through the Report templates admin page — nothing from the samples is hard-coded.
- **Baby Class keeps two distinct templates (A and B)** by design; the administrator selects per class.
- Primary intentionally reuses the existing marks card pending the school's requirements review (task §3: "do not assume KG templates should be reused for primary").

---

## 9. Screens & routes map

| Route | Screen |
|---|---|
| `/` | Dashboard home |
| `/academic/exams` | Exam list, sittings, statuses |
| `/academic/grading-schemes` | Grade band schemes (Primary A–E, Secondary NECTA A–F + division) |
| `/academic/classes/[classId]/subjects` | Class subject set-up (nursery classes see a template pointer panel instead) |
| `/academic/report-templates` | **Report template admin** (§7.4) |
| `/academic/report-cycles` | Cycle list & creation dialog |
| `…/[cycleId]/dashboard` | Cycle overview & KPIs |
| `…/[cycleId]/deadlines` | Subject marks deadlines |
| `…/[cycleId]/departments` | Department/HOD review |
| `…/[cycleId]/readiness` | Pre-generation readiness checklist |
| `…/[cycleId]/review` | Per-class approval (submit → approve, audit trail) |
| `…/[cycleId]/release` | Release cards / holds |
| `…/[cycleId]/batches` | Card generation batch runs |
| `…/[cycleId]/parents-day` | Parents' Day slots (staff side) |
| `…/[cycleId]/public-summary` | Anonymised public summary |
| `…/classes/[classId]/marks` | Marks grid — **or** the Nursery assessment editor for Early Years classes |
| `…/classes/[classId]/comments` | Comments entry — routed to the nursery editor for Early Years |
| `…/classes/[classId]/results` | Class results broadsheet |
| `…/classes/[classId]/targets` | Per-student targets |
| `…/students/[studentId]/report-card` | **Printable report card** (staff) — resolves the class template, toolbar with Print/Download hidden in print |
| `/portal/report-cards` (+ `/on-hold`) | Parent view of released cards (template-aware) |
| `/portal/progress` | Child progress overview |
| `/portal/parents-day` | Parents' Day booking |

---

## 10. Print & PDF export system

The print architecture (rewritten in commit `cc8f096`) is a **4-layer `@media print` block** in `src/app/globals.css`:

1. **Display-driven hiding** — everything outside `.print-area` is removed with `display:none` (plus a `visibility` fallback for engines without `:has()`), so toolbars, sidebars and page-break controls never reach paper.
2. **Ancestor whitening** — the print-area's container chain is stripped of borders, shadows and padding, killing the unwanted outer page frame while keeping intentional table borders.
3. **Print-area normalisation** — `.print-area` becomes static, full-width white paper (A4, `@page { size: A4; margin: 12mm }`), with `print-color-adjust: exact` preserving the maroon `#5C0A14` bands.
4. **Atomic pagination** — `tr`, `tbody`, `thead`, `img` and `.print-keep-together` carry `break-inside: avoid`, so subject rows, learning areas, assessment rows, comment blocks, chart images and the signature block never split across pages; content flows naturally with no blank pages.

Shared visual identity lives in `src/components/features/report-card/card-chrome.ts` (`BRAND #5C0A14`, `TBL`, `SECTION_BAR`, `COL_HEAD`, `CELL`, `CELL_LABEL`) and is imported by the marks-based card **and** every Early Years template — one school identity across all templates. The nursery card wraps each learning area in its own `<tbody>` and the comment/signature sections in `.print-keep-together`.

QA method: export a real print PDF via headless Chrome (agent-browser `pdf`), rasterise with `pdftoppm`, and inspect every page for split rows, stray chrome, blank pages and A4 sizing.

---

## 11. Performance chart engine

`src/lib/chart/performance-chart.ts` builds the grouped-bar chart (Achieved / Class Average / Class Topper) as a deterministic image:

- **Every bar carries an integer value label** (no missing numbers);
- wider bars with intra-group gaps (label-collision-safe);
- engine-aware semantics: `variant` mid-term vs terminal (§6.2);
- fallback text is rendered when chart generation returns null (`CHART_FALLBACK_TEXT`);
- regression-checked by `bun scripts/check-performance-chart.ts`.

---

## 12. Verification & QA workflow

Every change passes this chain before commit:

```bash
bun scripts/check-performance-chart.ts   # chart rules
bunx tsc --noEmit                        # 0 errors under src/
bunx eslint <changed files>              # lint
agent-browser open … / screenshot / pdf  # visual + print verification
pdftoppm -r 60 … /tmp/render && inspect  # page-by-page PDF check
```

Additional regression scripts in `scripts/`: `verify_template_switch.sh` / `verify_template_switch2.sh` (template assignment), `verify_remark_rules.sh` (comment gating), `validate_report_comments.ts`, `verify-chart.sh`, `verify-attendance.ts`, `verify-class-subjects.ts`, and others.

Git discipline: only changed files are staged per commit; messages describe the user-visible behaviour.

---

## 13. Changelog

| Commit | Change |
|---|---|
| `ef68ddd` | Report cards: three-sentence personalised subject comments on terminal/annual |
| `338d750` | Rename "Remarks" → "Comments" module-wide; labelled class teacher's comments row |
| `df712c4` | Chart: intra-group bar gaps + achieved-only labels (superseded by `aa151e2`) |
| `aa151e2` | Chart: wider bars and **integer value labels on every bar** |
| `96f2d5c`, `954437d`, `9a89861`, `29add05` | Internal checkpoint commits |
| `cc8f096` | **Print/PDF fix**: border-free export, editor chrome removed, keep-together atomic pagination, A4 fidelity |
| `bf6ac9b` | **Multi-school template system**: Baby Class A/B, KG1–KG3 competency templates, template registry + resolution hooks, admin page, nursery assessment entry, portal routing (+2,820 lines across 20 files) |
| `5e795b1`, `cd2c9ad` | Checkpoints after template work |

---

## 14. Known limitations & next steps

1. **Persistence is demo-grade.** The Prisma schema is a scaffold (`User`/`Post`); module state lives in the TypeScript demo dataset plus localStorage stores. Production needs real tables for template assignments, template configs, learning areas/benchmarks, competency scales, nursery assessments and assessment patches (the localStorage keys already model the exact shapes — see §7).
2. **Sample template files were not received.** The six named reference PDFs/XLSX are absent from the session upload folder, so Template A–E benchmark wording is an invented placeholder following the written structure. Administrators enter the school's exact wording via `/academic/report-templates`; no sample text is hard-coded.
3. **Primary template pending investigation.** Primary classes currently print the existing marks card; the task requires investigating it against the school's own primary requirements before any redesign.
4. **Sign-off & permissions.** Roles (Registrar, Teacher, Academic Dean, Principal, Guardian) follow the knowledge-base model but the demo app does not enforce auth.
5. **Bilingual output.** The knowledge base requires EN/SW on parent-facing strings; current cards are English-only (i18n scaffold present).
6. **Batch PDF generation** currently simulates runs in-app; real batch export can build on the print CSS + headless-Chrome pipeline proven in QA.
