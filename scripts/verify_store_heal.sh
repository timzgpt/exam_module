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

echo "=== A. seed the DRIFTED persisted state (class=Standard 5A, student=Form 3A st1) ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => { localStorage.setItem('josephian-context', JSON.stringify({ state: { cycleId: 'cy0', classId: 'cls-p5', studentId: 'st1' }, version: 0 })); return 'seeded'; })()"

echo "=== B. reload -> sidebar 'Report card preview' must open a Standard 5A card ==="
agent-browser open "http://127.0.0.1:3000/"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
agent-browser eval "(() => JSON.stringify({ stored: JSON.parse(localStorage.getItem('josephian-context')||'{}').state }))()"
agent-browser eval "(() => { const btn=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Report card preview'); if(!btn) return 'sidebar-btn-not-found'; btn.click(); return 'clicked'; })()"
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, standard5a: document.body.textContent.includes('Standard 5A'), divisionOrPoints: /division|points/i.test((document.querySelector('.print-area')?.textContent)||'') }))()"
agent-browser screenshot /tmp/render/healed-sidebar.png

echo "=== C. class switch persists consistent store ==="
agent-browser click "[aria-label='Class context']" && sleep 1
agent-browser eval '(() => { const opts=[...document.querySelectorAll("[role=option]")]; const el=opts.find(o=>o.textContent.trim()==="Form 1A"); if(!el) return "no-option"; const r=el.getBoundingClientRect(); const p={bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerId:1,isPrimary:true,button:0}; el.dispatchEvent(new PointerEvent("pointerdown",p)); el.dispatchEvent(new PointerEvent("pointerup",p)); el.dispatchEvent(new MouseEvent("click",p)); return "clicked"; })()'
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, stored: JSON.parse(localStorage.getItem('josephian-context')||'{}').state, form1a: document.body.textContent.includes('Form 1A') }))()"
agent-browser close
echo done
