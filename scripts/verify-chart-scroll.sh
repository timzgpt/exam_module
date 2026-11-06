#!/usr/bin/env bash
# Scroll each card to its chart section and screenshot the viewport there.
set -u
cd /home/z/my-project

setsid nohup bun run dev >> dev.log 2>&1 < /dev/null &
disown
code="000"
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "SERVER_READY_HTTP=$code"
[ "$code" != "200" ] && { echo "FATAL: server did not come up"; tail -20 dev.log; exit 1; }

agent-browser set viewport 1440 900 >/dev/null 2>&1

snap_chart() { # $1 url, $2 name
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  sleep 1
  agent-browser eval "document.querySelector('.chart-img')?.scrollIntoView({block:'center'}); 'scrolled'" >/dev/null 2>&1
  sleep 0.5
  echo "=== $2 ==="
  echo "chart-img found: $(agent-browser eval "!!document.querySelector('.chart-img')" 2>/dev/null)"
  echo "img natural size: $(agent-browser eval "(() => { const i = document.querySelector('.chart-img'); return i ? i.naturalWidth + 'x' + i.naturalHeight : 'none'; })()" 2>/dev/null)"
  agent-browser screenshot "/tmp/render/$2.png" >/dev/null 2>&1
}

snap_chart "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card" chart-terminal-secondary
snap_chart "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/st1/report-card" chart-midterm-secondary
snap_chart "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card" chart-midterm-primary
snap_chart "http://127.0.0.1:3000/academic/report-cycles/cy1/students/p5a-01/report-card" chart-terminal-primary
agent-browser close >/dev/null 2>&1
ls -la /tmp/render/ | tail -6
