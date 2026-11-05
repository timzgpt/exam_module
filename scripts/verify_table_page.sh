#!/usr/bin/env bash
# One-shot verification of the restyled subjects table: start the dev server,
# load the mid-term primary and terminal secondary report cards, screenshot
# them, then shut down.
set -u
cd /home/z/my-project
mkdir -p /tmp/render

(bun run dev > /tmp/dev.log 2>&1 &)

up=0
for i in $(seq 1 150); do
  sleep 1
  if curl -s -o /dev/null -m 2 http://127.0.0.1:3000; then up=1; break; fi
done
echo "server_up=$up"
[ "$up" = "1" ] || { tail -30 /tmp/dev.log; exit 1; }
sleep 4

agent-browser set viewport 1440 1600

echo "--- mid-term primary card (cy1m / p5a-01) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const t = document.querySelector('table'); if (!t) return 'NO TABLE'; const ths = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim().replace(/\s+/g,' ')); const rows = t.querySelectorAll('tbody tr').length; const first = t.querySelector('tbody tr td:nth-child(2) p')?.textContent; return JSON.stringify({ths, rows, first}); })()"
agent-browser screenshot /tmp/render/card-mid-full.png --full

echo "--- terminal secondary card (cy1 / st1) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const t = document.querySelector('table'); if (!t) return 'NO TABLE'; const ths = [...t.querySelectorAll('thead th')].map(th => th.textContent.trim().replace(/\s+/g,' ')); const rows = t.querySelectorAll('tbody tr').length; const first = t.querySelector('tbody tr td:nth-child(2) p')?.textContent; return JSON.stringify({ths, rows, first}); })()"
agent-browser screenshot /tmp/render/card-term-full.png --full

agent-browser close
echo done
