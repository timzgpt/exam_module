#!/usr/bin/env bash
# Route QA: all 23 module routes plus unknown-id deep links must return 200.
set -u
BASE="http://localhost:3000"
CY="cy1"
CLS="01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21"
ST="st1"

ROUTES=(
  "/academic/exams"
  "/academic/grading-schemes"
  "/academic/report-cycles"
  "/academic/report-cycles/$CY/readiness"
  "/academic/report-cycles/$CY/deadlines"
  "/academic/report-cycles/$CY/classes/$CLS/marks"
  "/academic/report-cycles/$CY/classes/$CLS/comments"
  "/academic/report-cycles/$CY/students/$ST/report-card"
  "/academic/report-cycles/$CY/review"
  "/academic/report-cycles/$CY/batches"
  "/academic/report-cycles/$CY/release"
  "/academic/report-cycles/$CY/departments"
  "/academic/report-cycles/$CY/dashboard"
  "/academic/report-cycles/$CY/public-summary"
  "/academic/report-cycles/$CY/parents-day"
  "/academic/classes/$CLS/subjects"
  "/academic/report-cycles/$CY/classes/$CLS/results"
  "/academic/report-cycles/$CY/classes/$CLS/targets"
  "/portal/report-cards"
  "/portal/report-cards/on-hold"
  "/portal/progress"
  "/portal/parents-day"
  "/verify"
)

fail=0
i=0
for r in "${ROUTES[@]}"; do
  i=$((i+1))
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE$r")
  if [ "$code" = "200" ]; then
    printf "  ok  %2d %s\n" "$i" "$r"
  else
    printf "FAIL  %2d %s -> %s\n" "$i" "$r" "$code"
    fail=1
  fi
done

# Unknown ids must fall back to the demo cycle/class without erroring.
for r in "/academic/report-cycles/some-unknown-cycle/readiness" "/academic/classes/unknown-class/subjects"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$BASE$r")
  if [ "$code" = "200" ]; then
    printf "  ok  fallback %s\n" "$r"
  else
    printf "FAIL  fallback %s -> %s\n" "$r" "$code"
    fail=1
  fi
done

if [ "$fail" = "0" ]; then
  echo "ALL ROUTES OK (23 + 2 fallbacks)"
else
  echo "ROUTE FAILURES DETECTED"
  exit 1
fi
