"""Fix the mangled SectionCard description line in the comments page."""

PATH = "src/app/(app)/academic/report-cycles/[cycleId]/classes/[classId]/comments/page.tsx"

# Tail constructed explicitly: } closes ${selected.updatedAt, ` closes the
# inner template, } closes the outer ${...}, ` closes the outer template,
# } closes the JSX description={ attribute.
TAIL = "}" + "`" + "}" + "`" + "}"

CORRECT = (
    "            description={`Adm. ${selectedStudent.admissionNo} · "
    "${!isComplete(selected) ? \"Incomplete record\" : "
    "`Last updated ${selected.updatedAt" + TAIL
)

with open(PATH, encoding="utf-8") as f:
    lines = f.read().split("\n")

fixed = 0
for i, line in enumerate(lines):
    if "Incomplete record" in line:
        lines[i] = CORRECT
        fixed += 1

with open(PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"Fixed {fixed} line(s)")
print("Result:", [l for l in lines if "Incomplete record" in l])
