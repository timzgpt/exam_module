#!/usr/bin/env bash
# One-shot: verify the report-cycle naming convention in the running app.
set -u
cd /home/z/my-project

(bun run dev > /tmp/dev.log 2>&1 &)

up=0
for i in $(seq 1 150); do
  sleep 1
  if curl -s -o /dev/null -m 2 http://127.0.0.1:3000; then up=1; break; fi
done
echo "server_up=$up"
[ "$up" = "1" ] || { tail -30 /tmp/dev.log; exit 1; }
sleep 4

agent-browser set viewport 1440 1200
echo "--- cycles page ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "JSON.stringify(Array.from(document.querySelectorAll('table tbody tr')).map(r => r.querySelector('p')?.textContent))"
agent-browser screenshot /tmp/render/cycles-page.png --full

echo "--- create dialog ---"
agent-browser find text "New cycle" click || true
sleep 1
agent-browser eval "(() => { const d = document.querySelector('[role=dialog]'); return d ? d.innerText.replace(/\n+/g,' | ') : 'NO DIALOG'; })()"
agent-browser screenshot /tmp/render/cycle-dialog.png

echo "--- report card header (mid-term) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 3
agent-browser eval "document.body.innerText.includes('Mid-Term - 2026') ? 'card shows Mid-Term - 2026' : 'name missing'"

agent-browser close
echo done
