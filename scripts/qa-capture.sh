#!/bin/bash
# QA capture: screenshot every module page + collect runtime errors.
BASE="http://localhost:3000"
OUT="/tmp/qa/pages"
mkdir -p "$OUT"
rm -f "$OUT"/*.png /tmp/qa/errors.txt

declare -a ROUTES=(
  "exams|/academic/exams"
  "grading|/academic/grading-schemes"
  "cycles|/academic/report-cycles"
  "dashboard|/academic/report-cycles/cy1/dashboard"
  "deadlines|/academic/report-cycles/cy1/deadlines"
  "readiness|/academic/report-cycles/cy1/readiness"
  "review|/academic/report-cycles/cy1/review"
  "batches|/academic/report-cycles/cy1/batches"
  "release|/academic/report-cycles/cy1/release"
  "public-summary|/academic/report-cycles/cy1/public-summary"
  "parents-day-admin|/academic/report-cycles/cy1/parents-day"
  "departments|/academic/report-cycles/cy1/departments"
  "report-card|/academic/report-cycles/cy1/students/st1/report-card"
  "comments|/academic/report-cycles/cy1/classes/01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21/comments"
  "results|/academic/report-cycles/cy1/classes/01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21/results"
  "targets|/academic/report-cycles/cy1/classes/01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21/targets"
  "subjects|/academic/classes/01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21/subjects"
  "portal-cards|/portal/report-cards"
  "portal-hold|/portal/report-cards/on-hold"
  "portal-progress|/portal/progress"
  "portal-day|/portal/parents-day"
)

for entry in "${ROUTES[@]}"; do
  name="${entry%%|*}"
  path="${entry#*|}"
  agent-browser open "$BASE$path" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1.2
  agent-browser screenshot "$OUT/$name.png" >/dev/null 2>&1
  errs=$(agent-browser errors 2>/dev/null | grep -v "✓ No errors" | grep -v "^$" || true)
  if [ -n "$errs" ]; then echo "[$name] $errs" >> /tmp/qa/errors.txt; fi
  echo "captured $name"
done
echo "--- error report ---"
cat /tmp/qa/errors.txt 2>/dev/null || echo "(no runtime errors on any page)"
