#!/usr/bin/env bash
# One-shot browser verification of the running app.
# The sandbox kills spawned processes after each tool call, so server + browser
# checks must happen inside a single invocation.
set -u
cd /home/z/my-project

# 1. Start dev server fully detached
setsid nohup bun run dev >> dev.log 2>&1 < /dev/null &
disown

# 2. Wait for readiness (max ~45s)
code="000"
for i in $(seq 1 45); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "SERVER_READY_HTTP=$code"
[ "$code" != "200" ] && { echo "FATAL: server did not come up"; tail -20 dev.log; exit 1; }

rm -rf /tmp/render && mkdir -p /tmp/render
agent-browser set viewport 1440 900 >/dev/null 2>&1

snap_page() { # $1 url, $2 name
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  echo "=== $2 ==="
  echo "url: $(agent-browser get url 2>/dev/null)"
  echo "title: $(agent-browser get title 2>/dev/null)"
  echo "page-errors: $(agent-browser errors 2>/dev/null | tail -n +2 | head -3)"
  agent-browser screenshot "/tmp/render/$2.png" >/dev/null 2>&1
}

snap_page http://127.0.0.1:3000/ home
snap_page http://127.0.0.1:3000/academic/report-cycles/cy1/classes/cls-1a/marks marks
snap_page http://127.0.0.1:3000/academic/classes/cls-1a/subjects subjects
snap_page http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card report-card

# Golden-path interactivity: navigate via sidebar link instead of URL
echo "=== INTERACTIVITY ==="
agent-browser open http://127.0.0.1:3000/ >/dev/null 2>&1
agent-browser wait --load networkidle >/dev/null 2>&1
if agent-browser find text "Exams" click >/dev/null 2>&1; then
  sleep 2
  echo "clicked 'Exams' link -> url now: $(agent-browser get url 2>/dev/null)"
else
  echo "click via text failed (will rely on direct-route checks)"
fi

# Mobile responsiveness
agent-browser set viewport 390 844 >/dev/null 2>&1
snap_page http://127.0.0.1:3000/ home-mobile

echo "=== CONSOLE (errors/warnings) ==="
agent-browser console 2>/dev/null | grep -iE 'error|warn' | head -8
agent-browser close >/dev/null 2>&1
ls -la /tmp/render/
