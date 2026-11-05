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

echo "=== open Form 3A card (secondary) ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true

echo "--- try clicking the header Class context select (Radix) ---"
agent-browser click "[aria-label='Class context']" || echo "CLICK-TRIGGER-FAILED"
sleep 1
agent-browser screenshot /tmp/render/hdr-open.png
echo "--- try clicking the Standard 5A option ---"
agent-browser click "[role='option']:has-text('Standard 5A')" || agent-browser click "text=Standard 5A" || echo "CLICK-OPTION-FAILED"
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, cls: document.querySelector('.print-area').textContent.includes('Standard 5A'), divisionWords: /division|points/i.test(document.querySelector('.print-area').textContent) }))()"
agent-browser screenshot /tmp/render/after-header-5a.png

echo "=== sidebar link sync check ==="
agent-browser eval "(() => JSON.stringify({ cardLinks: [...document.querySelectorAll('a[href*=\"report-card\"]')].map(a=>a.getAttribute('href')).slice(0,3) }))()" || true

echo "=== toolbar Class select on the card page: switch to Form 3A (secondary) ==="
agent-browser click "[aria-label='Class']" || echo "CLICK-TRIGGER2-FAILED"
sleep 1
agent-browser click "[role='option']:has-text('Form 3A')" || echo "CLICK-OPTION2-FAILED"
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, cls: document.querySelector('.print-area').textContent.includes('Form 3A'), divisionWords: /division|points/i.test(document.querySelector('.print-area').textContent) }))()"
agent-browser screenshot /tmp/render/after-toolbar-f3a.png
agent-browser close
echo done
