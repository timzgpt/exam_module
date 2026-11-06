"""Josephian Schools — report-card template analysis matrix.

Builds a 3-sheet workbook:
  1. Template Matrix   — structural comparison of the 7 report templates
  2. Class Assignment  — school section / class -> template mapping
  3. Implementation Map — renderer / entry / config surfaces per template

Template A-E rows are built from the task's written template structure
descriptions (the named sample PDFs were not received in this session);
Primary/Secondary rows describe the existing implemented templates.
"""

import sys, os

XLSX_SKILL_DIR = "/home/z/my-project/skills/xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

import base  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Alignment, Font  # noqa: E402
from openpyxl.utils import get_column_letter  # noqa: E402

base.use_palette_explicit("professional")

OUT = "/home/z/my-project/download/Josephian_Report_Template_Analysis_Matrix.xlsx"

wb = Workbook()
wb.properties.creator = "Z.ai"

WRAP = Alignment(horizontal="left", vertical="top", wrap_text=True)
WRAP_C = Alignment(horizontal="center", vertical="center", wrap_text=True)


def write_sheet(ws, title, headers, rows, widths, note=None):
    base.setup_sheet(ws, title=title, last_col=len(headers) + 1)
    for c, h in enumerate(headers, 2):
        ws.cell(row=4, column=c, value=h)
    base.style_header_row(ws, 4, 2, len(headers) + 1)
    for r, row in enumerate(rows, 5):
        for c, v in enumerate(row, 2):
            cell = ws.cell(row=r, column=c, value=v)
            cell.alignment = WRAP
        base.style_data_row(ws, r, 2, len(headers) + 1, r - 5)
        # keep the wrap alignment after styling
        for c in range(2, len(headers) + 2):
            ws.cell(row=r, column=c).alignment = WRAP
    for i, w in enumerate(widths, 2):
        ws.column_dimensions[get_column_letter(i)].width = w
    if note:
        nr = len(rows) + 6
        ws.cell(row=nr, column=2, value=note).font = base.font_caption()
        ws.cell(row=nr, column=2).alignment = WRAP
    ws.freeze_panes = "C5"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.print_title_rows = "4:4"


# ------------------------------------------------------------------
# Sheet 1 — Template Matrix
# ------------------------------------------------------------------
ws1 = wb.active
ws1.title = "Template Matrix"

H1 = [
    "Template",
    "School section · classes",
    "Structure (printed blocks, in order)",
    "Assessment fields (teacher input)",
    "Grading model",
    "Comments model",
    "Pagination & print (A4)",
    "Source",
]

R1 = [
    [
        "A · Baby Class — Developmental Assessment",
        "Nursery / Early Years · Baby Class (selectable template 1 of 2)",
        "School header & title band → learner particulars (name, class, admission no, date of assessment, class teacher) → ONE assessment table: Area of Development | Skills / developmental milestones | Teacher's Comments, with four area rows (Physical Development; Language Development; Social and Emotional Development; Cognitive Development) → class teacher's general comment → authorizing signatures → footer seal",
        "One descriptive teacher observation per development area (free text). Skills / milestones are printed from the curriculum configuration — they are never typed per child.",
        "NONE — developmental skills and descriptive observations only; no marks, no grades, no scale.",
        "Teacher's comments per area + a separate class teacher's general comment. Class-teacher comment stored independently of area comments.",
        "Targets one A4 page: particulars band, area rows kept atomic (a row never splits), comment + signatures + seal kept together; 12 mm page margin, maroon header band, no outer page frame.",
        "Task §2.A — 'Raylynn Rajab November 2025.pdf' (file not received; built from the written structure spec)",
    ],
    [
        "B · Baby Class — Four Developmental Domains",
        "Nursery / Early Years · Baby Class (selectable template 2 of 2 — preserved as a SEPARATE template, never merged with A)",
        "Header & title band → learner particulars → domain table: Domain | Developmental benchmark | Teacher's remarks, rows grouped under the four domains (Physical; Language; Social & Emotional; Cognitive) → class teacher's comments → authorizing signatures → footer seal",
        "Teacher's remark text per domain (one remark covers the domain's benchmark list). Benchmarks are configurable per term.",
        "NONE — narrative teacher remarks only.",
        "Teacher's remarks per domain + class teacher's comments (separate blocks).",
        "Row-per-benchmark blocks; each domain block atomic; repeating maroon header band on any continuation page; no split rows, no blank pages.",
        "Task §2.B — 'KWAME-WILLIAM RWEYEMAMU - TERMINAL REPORT 2026 - Sheet1.pdf' (file not received; built from the written structure spec)",
    ],
    [
        "C · KG1",
        "Nursery / Early Years · Kindergarten 1",
        "Header & title band → learner particulars → learning-area table with FOUR areas (Kindergarten Arithmetic; Early Language & Communication; Creative Arts and Sensory Play; Social Skills), each showing its benchmarks + teachers' remarks → general class teacher's comment → authorizing section → footer seal",
        "Teachers' remarks per learning area (observation-based). Benchmarks configurable.",
        "NONE — descriptive remarks rather than numerical subject grading.",
        "Teachers' remarks per area + general class teacher's comment (stored separately).",
        "Same family as B: atomic area blocks, repeating header band, clean A4 with 12 mm margins.",
        "Task §2.C — 'BRANDON NASHONI MNALI - Sheet1.pdf' (file not received; built from the written structure spec)",
    ],
    [
        "D · KG2",
        "Nursery / Early Years · Kindergarten 2",
        "Header & title band → learner particulars → learning-area table with FIVE areas (Kindergarten Arithmetic; Pre-Early Language & Communication; Early Lifeskills (Relations); Creative Art & Sensory Play; Social & Developmental Learning Skills); each area = multiple benchmark rows with individual competency grades + a dedicated comments row for that area → concluding class teacher's comment → authorizing section → footer seal",
        "Competency grade per benchmark + one comment per learning area.",
        "Competency scale: B — Beginner · D — Developing · C — Competent · HC — Highly Competent (configurable codes/labels).",
        "Dedicated comments section per learning area + concluding class teacher's comment; the two are stored and printed independently.",
        "Per-area atomic blocks (benchmark rows + area comment stay together); grades as compact chips; multi-page A4 with repeated header band and no orphaned section bars.",
        "Task §2.D — 'IVY LOREN GEORGE - Sheet1 (2).pdf' (file not received; built from the written structure spec)",
    ],
    [
        "E · KG3",
        "Nursery / Early Years · Kindergarten 3",
        "Header & title band → learner particulars → learning-area table with SIX areas (Early Numeracy; Early Language & Communication; Early Lifeskills (Relations); Sports, Arts & Crafts; Health & Environmental Care; Culture & Religion); benchmarks + competency grades + dedicated per-area comments → class teacher's comments → authorizing signatures → footer seal",
        "Competency grade per benchmark + one comment per learning area. Benchmarks, assessment periods and comments vary with the term's curriculum (config-driven).",
        "Competency scale B / D / C / HC (same configurable scale as KG2).",
        "Dedicated comments per learning area + class teacher's comments (independent).",
        "Longest nursery card (6 areas): area blocks atomic, repeating header band, signatures + seal kept together on the final page.",
        "Task §2.E — 'BRYSTON NASHON MNALI - Sheet1.pdf' + '_JOLENE BRIGHT PROTAS.xlsx' (files not received; built from the written structure spec)",
    ],
    [
        "Primary (existing)",
        "Primary · Standard / Grade classes (demo: Standard 5A)",
        "Header & title band → student particulars → subject results (Monthly / Terminal columns with weights, total, grade badge, progress) → performance summary → attendance → grading scale → performance chart → comments (class teacher + parental involvement) → signatures → seal",
        "Numeric marks per subject (0–100; CA/Exam split), attendance from the register.",
        "Primary A–E bands from the grading scheme; NO points, NO division.",
        "Subject teacher comment on Terminal/Annual cards only; class teacher's + parental involvement comments.",
        "Already implemented: maroon-table A4 layout, per-subject atomic tbody blocks, repeating table headers, border-free print (previous task).",
        "Existing implementation + knowledge base A3/A4 (verified working)",
    ],
    [
        "Secondary (existing)",
        "Secondary · Form 1–4",
        "As Primary, plus Points total, Division and Division Scale strip (NECTA CSEE).",
        "Numeric marks per subject; mark status codes (ABS/NA/NR/PENDING/DISQ).",
        "NECTA CSEE A–F with subject points; best-7 Division I–0.",
        "Same comment model as Primary (subject comments on terminal/annual).",
        "Already implemented (unchanged by this project).",
        "Existing implementation (verified working)",
    ],
]

write_sheet(
    ws1,
    "Josephian Schools — report-card template analysis matrix",
    H1,
    R1,
    [24, 24, 58, 38, 30, 36, 42, 36],
    note=(
        "Note: the six named sample files (5 PDFs + 1 XLSX) were not received in this working session. "
        "Templates A–E are modelled from the detailed structure descriptions in the task brief; every benchmark, "
        "comment label, scale and signature slot is ADMIN-CONFIGURABLE, so the exact wording of the original "
        "samples can be entered without code changes. No sample student names or results are hardcoded."
    ),
)

# ------------------------------------------------------------------
# Sheet 2 — Class Assignment
# ------------------------------------------------------------------
ws2 = wb.create_sheet("Class Assignment")
H2 = ["School section", "Class", "Report template", "Selection rule"]
R2 = [
    ["Nursery / Early Years", "Baby Class", "Baby Class Template A or B", "Administrator selects per class; both templates stay available and separate. Default: Template A."],
    ["Nursery / Early Years", "Kindergarten 1 (KG1)", "KG1 Template", "Fixed by class level; learning areas & benchmarks configurable."],
    ["Nursery / Early Years", "Kindergarten 2 (KG2)", "KG2 Template", "Fixed by class level; competency scale + benchmarks configurable."],
    ["Nursery / Early Years", "Kindergarten 3 (KG3)", "KG3 Template", "Fixed by class level; competency scale + benchmarks configurable."],
    ["Primary", "Primary classes (Standard / Grade 1–7)", "Existing primary report template", "Investigated: the existing primary card already matches school requirements (A–E bands, no points/division, attendance, chart). KG templates are NOT reused for primary."],
    ["Secondary", "Form 1–4", "Existing secondary report template", "Unchanged — NECTA CSEE points/division card; regression-protected."],
]
write_sheet(
    ws2,
    "Class → template assignment (administrative configuration)",
    H2,
    R2,
    [22, 34, 40, 62],
    note="Assignment is stored per class (not per term) so templates are reusable across academic terms without duplicating the design.",
)

# ------------------------------------------------------------------
# Sheet 3 — Implementation Map
# ------------------------------------------------------------------
ws3 = wb.create_sheet("Implementation Map")
H3 = ["Template", "Card renderer", "Rendered in", "Teacher entry screen", "Configuration surface", "Data stored"]
R3 = [
    ["A · Baby Class", "NurseryReportCard (baby-class-a layout)", "Staff report-card preview · parent portal · batch print", "Marks entry route branches to the nursery assessment editor (per-student observations + date of assessment)", "Report templates admin: areas, skills, comment labels, signatures", "nursery_assessments: areaRemarks, classTeacherComment, assessedOn"],
    ["B · Baby Class", "NurseryReportCard (baby-class-b layout)", "Same as A", "Nursery assessment editor (per-domain remarks)", "Report templates admin: domains, benchmarks, labels, signatures", "nursery_assessments: areaRemarks, classTeacherComment"],
    ["C · KG1", "NurseryReportCard (kg1 layout)", "Same as A", "Nursery assessment editor (per-area remarks)", "Report templates admin: areas, benchmarks, labels, signatures", "nursery_assessments: areaRemarks, classTeacherComment"],
    ["D · KG2", "NurseryReportCard (kg2 layout)", "Same as A", "Nursery assessment editor (benchmark B/D/C/HC grades + area comments)", "Report templates admin: areas, benchmarks, competency scale editor", "nursery_assessments: benchmarkGrades, areaComments, classTeacherComment"],
    ["E · KG3", "NurseryReportCard (kg3 layout)", "Same as A", "Same as KG2", "Same as KG2", "Same as KG2"],
    ["Primary (existing)", "Existing report-card page (primary variant)", "Same as A", "Existing marks entry grid (primary scheme)", "Grading schemes page (existing)", "Existing marks/components store"],
    ["Secondary (existing)", "Existing report-card page (secondary variant)", "Same as A", "Existing marks entry grid (NECTA scheme)", "Grading schemes page (existing)", "Existing marks/components store"],
]
write_sheet(
    ws3,
    "Implementation map — renderer, entry and configuration surfaces",
    H3,
    R3,
    [20, 34, 30, 44, 38, 38],
    note="One school reporting system, multiple class-specific report templates, one consistent administrative experience.",
)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
wb.save(OUT)
print("saved", OUT)
