#!/usr/bin/env bash
set -u
cd /home/z/my-project
mkdir -p /tmp/render
(bun run dev > /tmp/dev.log 2>&1 &)
up=0
for i in $(seq 1 150); do sleep 1; if curl -s -o /dev/null -m 2 http://127.0.0.1:3000; then up=1; break; fi; done
echo "server_up=$up"; [ "$up" = "1" ] || { tail -30 /tmp/dev.log; exit 1; }
sleep 4
agent-browser set viewport 1440 5400

chk() {
  agent-browser eval "(() => { const a=document.querySelector('.print-area'); const t=a?a.textContent:''; return JSON.stringify({ divisionOrPoints: /division|points/i.test(t), teacherRemarkWords: /teacher\\u2019s remark|teacher's remark/i.test(t), classTeacherCaption: /class teacher\\u2019s remark|class teacher's remark/i.test(t) }); })()"
}

echo "=== 1. TERMINAL 5A (cy1/p5a-01) — expect NO division/points words, NO remark captions ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/p5a-01/report-card"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
chk
agent-browser screenshot /tmp/render/v2-5a-terminal.png

echo "=== 2. MID-TERM 5A (cy1m/p5a-01) — captions KEPT, no division/points ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
chk
agent-browser screenshot /tmp/render/v2-5a-midterm.png

echo "=== 3. TERMINAL secondary (cy1/st1) — division+points kept, captions removed ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
chk

echo "=== 4. PARENT PORTAL (terminal, st1) — caption gone, 4th header blank, division kept ==="
agent-browser open "http://127.0.0.1:3000/portal/report-cards"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { const heads=[...document.querySelectorAll('.print-area thead th')].map(h=>h.textContent.trim()); const t=document.querySelector('.print-area').textContent; return JSON.stringify({ headers: heads, hasCaption: /class teacher/i.test(t), hasDivision: /division/i.test(t) }); })()"
agent-browser screenshot /tmp/render/v2-portal.png
agent-browser close
echo done
