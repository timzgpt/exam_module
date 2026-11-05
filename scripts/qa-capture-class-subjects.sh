#!/bin/bash
# Focused QA capture for the Class Subjects spec change.
BASE="http://localhost:3000"
CLS="01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21"
OUT="/tmp/qa/pages"
mkdir -p "$OUT"
rm -f "$OUT"/cs-*.png /tmp/qa/cs-errors.txt

declare -a ROUTES=(
  "cs-subjects|/academic/classes/$CLS/subjects"
  "cs-marks|/academic/report-cycles/cy1/classes/$CLS/marks"
  "cs-results|/academic/report-cycles/cy1/classes/$CLS/results"
  "cs-card-secondary|/academic/report-cycles/cy1/students/st1/report-card"
  "cs-card-primary|/academic/report-cycles/cy1/students/p5a-01/report-card"
  "cs-results-primary|/academic/report-cycles/cy1/classes/cls-p5/results"
  "cs-portal-cards|/portal/report-cards"
  "cs-portal-progress|/portal/progress"
)

for entry in "${ROUTES[@]}"; do
  name="${entry%%|*}"
  path="${entry#*|}"
  agent-browser open "$BASE$path" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1.2
  agent-browser screenshot "$OUT/$name.png" >/dev/null 2>&1
  errs=$(agent-browser errors 2>/dev/null | grep -v "✓ No errors" | grep -v "^$" || true)
  if [ -n "$errs" ]; then echo "[$name] $errs" >> /tmp/qa/cs-errors.txt; fi
  echo "captured $name"
done
echo "--- error report ---"
cat /tmp/qa/cs-errors.txt 2>/dev/null || echo "(no runtime errors on any page)"
