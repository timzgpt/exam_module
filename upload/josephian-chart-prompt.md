# JOSEPHIAN SCHOOLS — REPORT CARD CHART SYSTEM: AGENT PROMPT

This document covers everything about how the performance bar chart is built,
what data it shows, how it differs between Mid-Term and Terminal, and all the
rules an agent must follow when working with chart code.

Source files:
  MID-TERM:  MID-TERM/MIDTERM REPORT/scripts/report_chart.py
  TERMINAL:  TERMINAL/TERMINAL REPORT SAMPLE6/scripts/report_chart.py

---

## 1. WHAT THE CHART IS

Each student's report card contains ONE performance chart: a grouped bar chart
produced by matplotlib, saved as a PNG at 150 dpi, then base64-encoded and
embedded directly into the HTML as:

  <img class="chart-img" src="data:image/png;base64,{{ chart_image }}" />

It is NOT interactive. It is NOT a JavaScript chart. It is a static PNG image
baked into the PDF at generation time. No browser chart library is used.

The chart title (hardcoded in both trees) is:
  "Result Analysis in Percentage"

Y-axis label: "% Percentage"
X-axis label: "Subjects"
Y-axis range: 0 to 120 (Mid-Term) / 0 to 115 (Terminal)
Y-axis ticks: 0, 25, 50, 75, 100 (both trees)

---

## 2. THREE DATA SERIES (identical in both trees)

Every chart shows exactly 3 grouped bars side by side for each subject:

| Bar Position | Series | Color | Edge Color | Label |
|-------------|--------|-------|-----------|-------|
| Left (x - width) | Achieved Marks | #E74C3C (red) | #C0392B | "Achieved Marks" |
| Centre (x) | Class Average | #3498DB (blue) | #2980B9 | "Class Avg" |
| Right (x + width) | Class Topper | #2ECC71 (green) | #27AE60 | "Class Topper" |

The STRONGEST SUBJECT's Achieved bar is drawn in a DARKER RED:
  Normal achieved bar:   #E74C3C (lighter red)
  Strongest subject bar: #C0392B (darker red), edge #7B241C (Mid-Term)
                                               edge same as fill (Terminal)

Value labels (the actual number) are printed above every bar:
  Achieved bar labels: bold, font ~8-8.5pt
  Class Avg labels:    normal weight
  Class Topper labels: normal weight
  Label color: #1C1008 (dark brown-black)
  Label position: bar.height + 1.5 offset above the bar

Bars with height 0 or less are skipped — no label printed above them.

---

## 3. WHICH SUBJECTS APPEAR ON THE CHART

The chart only includes subjects where the student has a TOTAL score (i.e. total != "-").
Subjects with no marks (both monthly and exam blank) are omitted — same rule as the table.

The chart series is built by `build_chart_series()`:
  Input:  subj_rows (the per-subject result dicts), class_avg list, class_top list, strongest_name
  Output: labels[], achieved[], avg[], top[], strongest_idx (integer index)

The labels list uses SHORTENED subject names (see Section 5 below).
The class_avg and class_top lists are indexed by subject position (0-based).

---

## 4. HOW CLASS AVERAGE AND CLASS TOPPER ARE CALCULATED

Both are computed by `compute_class_stats(excel_path, subjects)` which reads
the workbook directly — it does NOT use data already loaded by report_service.py.

It reads rows 8–47 from the marks sheets (up to 40 students), then for each
subject column computes the weighted score for every student who has marks.

### MID-TERM (`compute_class_stats` in mid-term report_chart.py):
- Reads sheet "Monthly Marks" AND "Mid-Term Marks"
  (or "Opening Test" / "Monthly Test" for Form 2 Vocational variant)
- Uses the SAME 25/75 weighted formula as report_service:
    Both marks present:  score = monthly × 0.25 + exam × 0.75
    Only monthly:        score = monthly × 1.0   (counts as 100%)
    Only exam:           score = exam × 1.0       (counts as 100%)
    Neither:             student skipped for that subject
- class_avg = mean of all students' weighted scores for that subject
- class_top = max  of all students' weighted scores for that subject
- Divides by COUNT of students who actually have marks — not by total roster size

### TERMINAL (`compute_class_stats` in terminal report_chart.py):
- Reads sheet "Monthly Marks" AND "Terminal Marks"
- Uses STRICTER weighted formula — ONLY counts students who have BOTH marks:
    Both present: score = monthly × 0.25 + terminal × 0.75
    Only one:     student is SKIPPED for that subject (weighted_score returns None)
- This is a known difference from the mid-term engine. Terminal class stats
  only count students with complete marks.

CRITICAL: Both functions read with data_only=True. If formulas have not been
calculated and saved in Excel, class averages will be 0.0 for all subjects.

---

## 5. SUBJECT LABEL SHORTENING

Long subject names are shortened for the x-axis so bars don't overlap.

`short_label(name)` checks the LABEL_SHORT dictionary first. If not found,
it uses the full name if 14 chars or fewer, otherwise truncates to 12 chars + "."

### MID-TERM LABEL_SHORT map (complete):
  "Arithmetic"                          → "Arithmetic"
  "English Language Skills"             → "English"
  "Kiswahili"                           → "Kiswahili"
  "Reading"                             → "Reading"
  "Writing"                             → "Writing"
  "Culture, Arts & Sports"              → "Culture & Arts"
  "Culture, Art & Sports"               → "Culture & Arts"   (Grade 2 variant)
  "Health & Environment"                → "Health & Env."
  "Mathematics"                         → "Math"
  "English"                             → "English"
  "Historia na Maadili"                 → "Hist. & Maadili"
  "Geography"                           → "Geography"
  "Business Studies"                    → "Business"
  "History"                             → "History"
  "Physics"                             → "Physics"
  "Chemistry"                           → "Chemistry"
  "Biology"                             → "Biology"
  "Bookkeeping"                         → "Bookkeeping"
  "Computer Science"                    → "Comp. Sci."
  "Science & Technology"                → "Science & Tech"
  "Historia ya Tanzania na Maadili"     → "Historia"
  "Historia ya Tanzania Na Maadili"     → "Historia"         (capitalisation variant)
  "Geography & Environment"             → "Geog. & Env."
  "Arts and Sports"                     → "Arts & Sports"
  "Music"                               → "Music"
  "Vocational Skills"                   → "Vocational"
  "Social Studies (SST)"                → "Social Studies"
  "ICT"                                 → "ICT"
  "Civic and Moral Education"           → "Civic & Moral"

### TERMINAL LABEL_SHORT map (smaller — only secondary subjects):
  "Arithmetic", "English Language Skills", "Kiswahili", "Reading", "Writing",
  "Culture, Arts & Sports", "Health & Environment", "Mathematics", "English",
  "Historia na Maadili", "Geography", "Business Studies", "History",
  "Physics", "Chemistry", "Biology", "Bookkeeping", "Computer Science"

  NOTE: Terminal LABEL_SHORT is MISSING several Primary subject mappings that
  Mid-Term has. If a primary subject name is not in Terminal's map and is longer
  than 14 chars, it will be truncated with "." — this is known and expected for
  the Terminal tree since the original Terminal template predates Grades 3–6 additions.

RULE FOR AGENTS: If you add a new subject and its name is longer than 14 characters,
add it to LABEL_SHORT in report_chart.py for that tree, or the axis label will be
truncated. Add to BOTH trees if the subject appears in both.

---

## 6. FIGURE SIZE AND LAYOUT

### MID-TERM figure sizing (dynamic, proportional):
  fig_w = max(12.0, n × 1.5)      where n = number of subjects
  fig_h = fig_w / 3.0             FIXED RATIO — chart is always 3× wider than tall

This fixed 3:1 aspect ratio is intentional. A fixed height (not ratio) caused a
7-subject chart to be TALLER than a 12-subject chart on the page because the
figure got squarer as width shrank. The ratio keeps every card the same chart height.

  bar_width = 0.22 (fixed for all subject counts)
  x_pad     = 0.55 (half-unit padding either side so edge bars aren't clipped)

Font sizes scale with subject count:
  tick_fs  = 10 (n ≤ 7)  |  9 (n ≤ 10)  |  8 (n > 10)
  value_fs = 8.5 (n ≤ 8) |  7.5 (n > 8)

X-tick label rotation:
  0°  (n ≤ 6, centered)
  12° (n ≤ 9, right-aligned)
  15° (n > 9, right-aligned)

Legend position: below chart, centered, 3 columns, no frame box.
  legend_y = -0.18 (rotation 0°) or -0.24 (rotation > 0°)

Subplot margins:
  left=0.07, right=0.98, top=0.91
  bottom=0.20 (rotation 0°) or 0.26 (rotation > 0°)

### TERMINAL figure sizing (older, less dynamic):
  fig_w = max(8.5, min(14.0, n × 0.95))   — capped at 14 inches
  fig_h = max(3.8, fig_w / 2.4)           — approximately 2.4:1 ratio, min 3.8

  width = min(0.22, max(0.12, 0.65 / n))  — bar width adapts to subject count

Font sizes:
  label_fs = 6 (n > 10)  |  7 (n > 7)  |  8 (n ≤ 7)
  value_fs = 6 (Avg/Top) |  7 (Achieved, bold)

X-tick label rotation:
  40° (n > 6, right-aligned)
  28° (n ≤ 6, right-aligned)

NO legend printed in the Terminal chart function itself.
The legend (3 color swatches) is rendered in the HTML template separately,
below the chart image. This is a key difference from Mid-Term.

Subplot margins:
  left=0.07, right=0.99, bottom=0.36, top=0.90

Both trees save at 150 dpi, format PNG, bbox_inches="tight", pad_inches=0.15,
white background (#FFFFFF), then base64-encode to ASCII.

---

## 7. HOW THE CHART GETS INTO THE CARD — CALL SEQUENCE

```
report_service.py:
  1. load_excel_data(excel_path)           → raw workbook data
  2. detect_subjects(data) or Instructions sheet → subjects list
  3. calculate_subject_rows(data, subjects) → subj_rows list (includes "total", "name", "idx")
  4. find_strongest(subj_rows)              → strongest subject name
  5. compute_class_stats(excel_path, subjects)   → class_avg[], class_top[]
  6. build_chart_series(subj_rows, class_avg, class_top, strongest_name)
                                            → labels[], achieved[], avg[], top[], strongest_idx
  7. generate_chart_base64(labels, achieved, avg, top, strongest_idx)
                                            → base64 PNG string (or None)
  8. Pass chart_image to Jinja2 template context
  9. Template embeds: <img src="data:image/png;base64,{{ chart_image }}">
```

If `generate_chart_base64` receives an empty labels list, it returns `None`.
The template then renders the fallback: "No complete subject scores to chart."

---

## 8. WHERE CHART APPEARS IN THE TEMPLATE

### Mid-Term (Primary and Secondary):
  Section: `<section class="section section--chart-scales">`
  Inside div: `<div class="chart-section-group">`
  Title shown in HTML: "Performance Charts" (section heading)
  Additional HTML text above chart image:
    - `<p class="chart-inner-title">Subject Score Analysis</p>`
    - `<p class="chart-inner-sub">Student score vs class average across all subjects</p>`
  Badge above chart: "★ Strongest Subject: {{ top_subject.name }} - {{ top_subject.score }} / 100
                      | ▲ Best Improvement: {{ best_improvement.name }} - {{ best_improvement.value }}"
                     (Best Improvement only shown if show_midterm True — Primary only)
  Legend: NOT in the HTML — the chart PNG itself has a matplotlib legend below the bars

### Terminal (Primary and Secondary):
  Section: `<section class="section section--chart-scales">`
  Inside div: `<div class="chart-section-group">`
  Title shown in HTML: "Performance Charts" (Primary) / "Performance Chart" (Secondary)
  NO inner title/subtitle paragraphs
  Badge above chart: "★ Strongest Subject: {{ top_subject.name }} — {{ top_subject.score }} / 100"
                     (no Best Improvement badge — Terminal templates don't show it in chart section)
  Legend: IN THE HTML as 3 div elements with colored swatches:
    <span class="chart-legend__swatch" style="background:#E74C3C"> Achieved Marks
    <span class="chart-legend__swatch" style="background:#3498DB"> Class Avg
    <span class="chart-legend__swatch" style="background:#2ECC71"> Class Topper

---

## 9. DIFFERENCES BETWEEN MID-TERM AND TERMINAL CHART CODE

| Detail | Mid-Term | Terminal |
|--------|----------|---------|
| File | report_chart.py (Mid-Term tree) | report_chart.py (Terminal tree) |
| Partial marks in class stats | ✅ Single assessment counts 100% | ❌ Only students with BOTH marks counted |
| Sheet names read | "Monthly Marks" + "Mid-Term Marks" | "Monthly Marks" + "Terminal Marks" |
| Form 2 Vocational variant | ✅ Handles "Opening Test"/"Monthly Test" sheets | ❌ Not handled |
| Figure aspect ratio | Fixed 3:1 (fig_h = fig_w / 3.0) | ~2.4:1 (fig_h = fig_w / 2.4), min 3.8 |
| Figure width max | Unbounded (grows with n) | Capped at 14 inches |
| Bar width | Fixed 0.22 | Adaptive: min(0.22, max(0.12, 0.65/n)) |
| Strongest bar edge | Darker edge #7B241C | Same as fill color |
| In-chart legend | ✅ matplotlib legend below bars | ❌ No legend in PNG; HTML renders it |
| Label rotation | 0° / 12° / 15° (adaptive) | 28° / 40° (two levels only) |
| Y-axis ceiling | 120 | 115 |
| LABEL_SHORT coverage | Full (Primary + Secondary subjects) | Secondary-focused (missing some Primary names) |

---

## 10. RULES FOR AGENTS

1. **Never replace matplotlib with a JS chart library.** The PDF pipeline uses
   Playwright to render HTML to PDF. A JS chart that renders asynchronously may
   not finish before Playwright captures the page. The base64 PNG approach is
   intentional and reliable.

2. **The chart PNG is generated once per student per batch.** It is not cached
   between students. Each call to `generate_chart_base64()` creates a new figure,
   saves it, and closes it (`plt.close(fig)`) to free memory.

3. **If class_avg is all zeros**, the workbook formulas were not cached in Excel.
   The fix is Ctrl+Shift+F9 in Excel → Save → re-upload. Do not change chart code
   to work around uncached formulas.

4. **strongest_idx** is set by `build_chart_series()` by matching subject name to
   `strongest_name`. It defaults to 0 if no match is found — which means the first
   subject's bar will be darkened. Ensure `strongest_name` is the exact string from
   the subject row, not a shortened label.

5. **Adding a new subject** requires adding its name to LABEL_SHORT in report_chart.py
   if the name is more than 14 characters. Without this, the axis label will be
   truncated to 12 chars + "." which may be unreadable.

6. **Do not set a fixed fig_h in Mid-Term.** The 3:1 ratio (fig_h = fig_w / 3.0) is
   deliberate. A fixed height caused 7-subject cards to be taller than 12-subject
   cards on the printed page because the figure became squarer as width shrank.

7. **Do not change dpi from 150.** Lower dpi makes bar labels blurry in the PDF.
   Higher dpi increases file size significantly without visible benefit.

8. **Subjects with total == "-" are excluded from the chart** (same as the table).
   The `build_chart_series()` function checks `row["total"] == "-"` and skips those rows.
   A subject skipped in the table is always skipped in the chart.

9. **Mid-Term partial marks rule applies to class stats too.** `compute_class_stats()`
   in the Mid-Term tree applies the same 100% rule as `report_service.py` — a student
   with only one assessment contributes their single mark to the class average. The
   Terminal tree does NOT do this — a student with only one mark is excluded from
   Terminal class stats entirely. Keep these behaviours in their respective trees.

10. **The chart image variable passed to the template is `chart_image` (string).**
    If it is empty string or None, the template shows the fallback paragraph instead
    of a broken image tag.
