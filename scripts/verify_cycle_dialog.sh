#!/usr/bin/env bash
# One-shot: open the create-cycle dialog and verify the derived name preview.
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
agent-browser open "http://127.0.0.1:3000/academic/report-cycles"
sleep 3
agent-browser eval "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('New cycle')); if (!b) return 'button not found'; b.click(); return 'clicked'; })()"
sleep 1
agent-browser eval "(() => { const d = document.querySelector('[role=dialog]'); return d ? d.innerText.replace(/\n+/g,' | ') : 'NO DIALOG'; })()"
agent-browser screenshot /tmp/render/cycle-dialog.png
agent-browser close
echo done
