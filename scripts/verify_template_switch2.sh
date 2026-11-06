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

CLICK_OPT='(() => { const label="__LABEL__"; const opts=[...document.querySelectorAll("[role=option]")]; const el=opts.find(o=>o.textContent.trim()===label); if(!el) return "option-not-found:"+opts.map(o=>o.textContent.trim()).join("|"); const r=el.getBoundingClientRect(); const p={bubbles:true,cancelable:true,clientX:r.x+r.width/2,clientY:r.y+r.height/2,pointerId:1,isPrimary:true,button:0}; el.dispatchEvent(new PointerEvent("pointermove",p)); el.dispatchEvent(new PointerEvent("pointerdown",p)); el.dispatchEvent(new PointerEvent("pointerup",p)); el.dispatchEvent(new MouseEvent("click",p)); return "clicked:"+label; })()'

echo "=== 1. Form 3A card -> header Class context -> Standard 5A ==="
agent-browser open "http://127.0.0.1:3000/academic/report-cycles/cy1/students/st1/report-card"
sleep 4; agent-browser wait --load networkidle --timeout 30000 || true
agent-browser click "[aria-label='Class context']" && sleep 1
agent-browser eval "${CLICK_OPT/__LABEL__/Standard 5A}"
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, standard5a: document.querySelector('.print-area').textContent.includes('Standard 5A'), divisionOrPoints: /division|points/i.test(document.querySelector('.print-area').textContent), gradeBand: [...document.querySelectorAll('.print-area table')].filter(t=>/GRADING SCALE/i.test(t.textContent)).map(t=>[...t.querySelectorAll('tbody td:first-child')].map(td=>td.textContent.trim().replace(' \\u25b2','').trim()).join('')) }))()"
agent-browser screenshot /tmp/render/switch-5a.png

echo "=== 2. store/sidebar sync ==="
agent-browser eval "(() => JSON.stringify({ studentLinks: [...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>h&&h.includes('/students/')).slice(0,4) }))()"

echo "=== 3. toolbar Class select -> Form 3A (secondary template) ==="
agent-browser click "[aria-label='Class']" && sleep 1
agent-browser eval "${CLICK_OPT/__LABEL__/Form 3A}"
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, form3a: document.querySelector('.print-area').textContent.includes('Form 3A'), divisionOrPoints: /division|points/i.test(document.querySelector('.print-area').textContent) }))()"
agent-browser screenshot /tmp/render/switch-f3a.png

echo "=== 4. toolbar Class -> Standard 5A again (template flips back) ==="
agent-browser click "[aria-label='Class']" && sleep 1
agent-browser eval "${CLICK_OPT/__LABEL__/Standard 5A}"
sleep 3
agent-browser eval "(() => JSON.stringify({ url: location.pathname, standard5a: document.querySelector('.print-area').textContent.includes('Standard 5A'), divisionOrPoints: /division|points/i.test(document.querySelector('.print-area').textContent) }))()"
agent-browser close
echo done
