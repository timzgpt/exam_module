#!/usr/bin/env bash
# One-shot browser verification of the spec-compliant performance chart.
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
  sleep 1
  echo "=== $2 ==="
  echo "url: $(agent-browser get url 2>/dev/null)"
  echo "title: $(agent-browser get title 2>/dev/null)"
  echo "page-errors: $(agent-browser errors 2>/dev/null | tail -n +2 | head -3)"
  agent-browser screenshot "/tmp/render/$2.png" >/dev/null 2>&1
}

# Terminal secondary (default demo card): grouped bars + HTML legend
snap_page "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card" card-terminal-secondary
# Mid-term secondary: in-SVG legend, no HTML legend row
snap_page "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/st1/report-card" card-midterm-secondary
# Mid-term primary: Best-Improvement badge + inner title/sub
snap_page "http://127.0.0.1:3000/academic/report-cycles/cy1m/students/p5a-01/report-card" card-midterm-primary
# Terminal primary: footnote explainer, no improvement badge
snap_page "http://127.0.0.1:3000/academic/report-cycles/cy1/students/p5a-01/report-card" card-terminal-primary

echo "=== CONSOLE (errors/warnings) ==="
agent-browser console 2>/dev/null | grep -iE 'error|warn' | head -8
agent-browser close >/dev/null 2>&1
ls -la /tmp/render/
