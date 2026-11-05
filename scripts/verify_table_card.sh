#!/usr/bin/env bash
# One-shot verification of the all-white table report card design:
# start dev server, screenshot mid-term primary + terminal secondary cards
# and the parent portal card, assert the logo is served, then shut down.
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

echo "logo_http=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/josephian-logo.png)"

agent-browser set viewport 1440 1600

echo "--- mid-term primary card (cy1m / p5a-01) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "JSON.stringify({logo: !!document.querySelector('img[src=\"/josephian-logo.png\"]'), chart: !!document.querySelector('.chart-img'), tables: document.querySelectorAll('.print-area table').length, maroon: !!document.querySelector('.print-area .bg-\\\\[\\\\#5C0A14\\\\]')})"
agent-browser screenshot /tmp/render/card-mid-full.png --full

echo "--- terminal secondary card (cy1 / st1) ---"
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 3
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "JSON.stringify({logo: !!document.querySelector('img[src=\"/josephian-logo.png\"]'), chart: !!document.querySelector('.chart-img'), tables: document.querySelectorAll('.print-area table').length, cream: !!document.querySelector('.print-area [class*=\"F7F2E9\"], .print-area [class*=\"F3ECDD\"]')})"
agent-browser screenshot /tmp/render/card-term-full.png --full

agent-browser close
echo done
