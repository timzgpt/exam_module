#!/usr/bin/env bash
# One-shot verification: start the dev server, load the mid-term primary and
# terminal secondary report cards, screenshot them, then shut down.
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

agent-browser set viewport 1440 1600

echo "--- mid-term primary card (cy1m / p5a-01) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "document.querySelector('.chart-img') ? 'chart found' : 'NO CHART'"
agent-browser eval "(() => { const el = document.querySelector('.chart-img'); if (!el) return 'none'; const r = el.getBoundingClientRect(); return JSON.stringify({x: r.x + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height}); })()" > /tmp/render/mid-box.txt
cat /tmp/render/mid-box.txt
agent-browser screenshot /tmp/render/card-mid-full.png --full

echo "--- terminal secondary card (cy1 / st1) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "document.querySelector('.chart-img') ? 'chart found' : 'NO CHART'"
agent-browser eval "(() => { const el = document.querySelector('.chart-img'); if (!el) return 'none'; const r = el.getBoundingClientRect(); return JSON.stringify({x: r.x + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height}); })()" > /tmp/render/term-box.txt
cat /tmp/render/term-box.txt
agent-browser screenshot /tmp/render/card-term-full.png --full

agent-browser close
echo done
