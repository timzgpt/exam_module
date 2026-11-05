#!/usr/bin/env bash
set -u
cd /home/z/my-project
mkdir -p /tmp/render
(bun run dev > /tmp/dev.log 2>&1 &)
up=0
for i in $(seq 1 150); do sleep 1; if curl -s -o /dev/null -m 2 http://127.0.0.1:3000; then up=1; break; fi; done
echo "server_up=$up"; [ "$up" = "1" ] || { tail -30 /tmp/dev.log; exit 1; }
sleep 4
agent-browser set viewport 1440 1000

echo "=== TERMINAL 5A card (cy1 / p5a-01) ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/p5a-01/report-card"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const a=document.querySelector('.print-area'); const t=a?a.textContent:''; return JSON.stringify({ rows: a.querySelectorAll('table').length, hasDivisionWord: /division/i.test(t), hasPointsWord: /points/i.test(t), hasTeacherRemark: /teacher.s remark/i.test(t), hasAwaiting: /awaiting/i.test(t) }); })()"
agent-browser eval "(() => { const tables=[...document.querySelectorAll('.print-area table')]; const s=tables.find(t=>/PERFORMANCE SUMMARY/i.test(t.textContent)); const g=tables.find(t=>/GRADING SCALE/i.test(t.textContent)); return JSON.stringify({ summaryHeaders:[...(s?.querySelectorAll('th')??[])].map(h=>h.textContent.trim()), gradingHeaders:[...(g?.querySelectorAll('thead th')??[])].map(h=>h.textContent.trim()) }); })()"
agent-browser screenshot /tmp/render/5a-terminal-full.png

echo "=== MID-TERM 5A card (cy1m / p5a-01) ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const a=document.querySelector('.print-area'); const t=a?a.textContent:''; return JSON.stringify({ hasDivisionWord: /division/i.test(t), hasPointsWord: /points/i.test(t) }); })()"
agent-browser screenshot /tmp/render/5a-midterm-full.png

echo "=== SECONDARY terminal card (cy1 / st1) sanity ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const a=document.querySelector('.print-area'); const t=a?a.textContent:''; return JSON.stringify({ hasDivisionWord: /division/i.test(t), hasPointsWord: /points/i.test(t) }); })()"

echo "=== results analysis (5A) ==="
agent-browser open "http://127.0.0.1:3000/academic/results"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => JSON.stringify({ divisionWord: document.body.textContent.includes('Division'), pointsWord: /points/i.test(document.body.textContent) }))()" || true
agent-browser close
echo done
