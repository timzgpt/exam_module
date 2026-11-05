#!/usr/bin/env bash
# One-shot browser verification of the KB-alignment changes (A3.8 attendance,
# card visuals, portal rules, readiness checks). Server + browser checks must
# happen inside a single invocation (the sandbox kills spawned processes).
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

rm -rf /tmp/render && mkdir -p /tmp/render
agent-browser set viewport 1440 900 >/dev/null 2>&1

snap_page() { # $1 url, $2 name
  agent-browser open "$1" >/dev/null 2>&1
  agent-browser wait --load networkidle >/dev/null 2>&1
  echo "=== $2 ==="
  echo "url: $(agent-browser get url 2>/dev/null)"
  echo "title: $(agent-browser get title 2>/dev/null)"
  echo "page-errors: $(agent-browser errors 2>/dev/null | tail -n +2 | head -4)"
  agent-browser screenshot "/tmp/render/$2.png" >/dev/null 2>&1
}

snap_page "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card" card-top
agent-browser scroll down 900 >/dev/null 2>&1; sleep 1
agent-browser screenshot /tmp/render/card-mid.png >/dev/null 2>&1
agent-browser scroll down 900 >/dev/null 2>&1; sleep 1
agent-browser screenshot /tmp/render/card-bottom.png >/dev/null 2>&1

snap_page "http://127.0.0.1:3000/portal/report-cards" portal-card
snap_page "http://127.0.0.1:3000/academic/report-cycles/cy1/readiness" readiness

echo "=== CONSOLE (errors/warnings) ==="
agent-browser console 2>/dev/null | grep -iE 'error|warn' | head -8
agent-browser close >/dev/null 2>&1
ls -la /tmp/render/
