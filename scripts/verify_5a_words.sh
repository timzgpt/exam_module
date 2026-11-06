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

echo "=== TERMINAL 5A card: where do 'division'/'points' words appear? ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/p5a-01/report-card"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const a=document.querySelector('.print-area'); const out=[]; const walk=document.createTreeWalker(a, NodeFilter.SHOW_TEXT); let n; while((n=walk.nextNode())){ const tx=n.textContent.trim(); if(/division|points/i.test(tx)){ const el=n.parentElement; out.push({tag:el.tagName, cls:(el.className||'').toString().slice(0,80), text:tx.slice(0,160)}); } } return JSON.stringify(out,null,1); })()"

echo "=== full-height screenshots ==="
agent-browser set viewport 1440 5200
sleep 2
agent-browser screenshot /tmp/render/5a-terminal-TALL.png
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 4
agent-browser wait --load networkidle --timeout 30000 || true
agent-browser screenshot /tmp/render/5a-midterm-TALL.png
agent-browser close
echo done
