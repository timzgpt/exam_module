#!/usr/bin/env python3
"""Render verification for the Josephian app using the kit's doctrine:
visit every route, collect console/page errors, measure horizontal overflow
at 390 and 280 px, exercise the sidebar collapse, and screenshot key pages.
"""
import json
import sys
from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
CY = "cy1"
CLS = "01a1a064-7c3b-4e2d-9f1a-8b5c6d4e3f21"
ST = "st1"

ROUTES = [
    ("/", "home"),
    ("/academic/exams", "exams"),
    ("/academic/grading-schemes", "grading-schemes"),
    ("/academic/report-cycles", "report-cycles"),
    (f"/academic/report-cycles/{CY}/dashboard", "cycle-dashboard"),
    (f"/academic/report-cycles/{CY}/readiness", "readiness"),
    (f"/academic/report-cycles/{CY}/deadlines", "deadlines"),
    (f"/academic/report-cycles/{CY}/classes/{CLS}/marks", "marks"),
    (f"/academic/report-cycles/{CY}/classes/{CLS}/comments", "comments"),
    (f"/academic/report-cycles/{CY}/classes/{CLS}/results", "results"),
    (f"/academic/report-cycles/{CY}/classes/{CLS}/targets", "targets"),
    (f"/academic/report-cycles/{CY}/students/{ST}/report-card", "report-card"),
    (f"/academic/report-cycles/{CY}/review", "review"),
    (f"/academic/report-cycles/{CY}/batches", "batches"),
    (f"/academic/report-cycles/{CY}/release", "release"),
    (f"/academic/report-cycles/{CY}/departments", "departments"),
    (f"/academic/report-cycles/{CY}/public-summary", "public-summary"),
    (f"/academic/report-cycles/{CY}/parents-day", "cycle-parents-day"),
    (f"/academic/classes/{CLS}/subjects", "class-subjects"),
    ("/portal/report-cards", "portal-report-cards"),
    ("/portal/report-cards/on-hold", "portal-on-hold"),
    ("/portal/progress", "portal-progress"),
    ("/portal/parents-day", "portal-parents-day"),
]

SHOTS = {
    "exams": [1280, 800], "marks": [1440, 900], "report-card": [1440, 1600],
    "portal-report-cards": [390, 844], "cycle-dashboard": [1280, 900],
    "home": [1280, 800],
}

errors = []
overflow = []

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    page.on("console", lambda m: errors.append(f"console[{m.type}] {m.text[:160]}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"pageerror {str(e)[:160]}"))

    for route, name in ROUTES:
        try:
            r = page.goto(BASE + route, wait_until="networkidle", timeout=30000)
            status = r.status if r else 0
        except Exception as e:
            status = str(e)[:80]
        doc_w = page.evaluate("document.documentElement.scrollWidth")
        win_w = page.evaluate("window.innerWidth")
        if isinstance(win_w, int) and doc_w > win_w + 2:
            overflow.append(f"desktop {route}: doc {doc_w} > win {win_w}")
        print(f"{status}  {route}")

    # Mobile overflow sweep at 390 and 280
    for w in (390, 280):
        page.set_viewport_size({"width": w, "height": 844})
        for route, name in ROUTES:
            page.goto(BASE + route, wait_until="networkidle", timeout=30000)
            doc_w = page.evaluate("document.documentElement.scrollWidth")
            if doc_w > w + 2:
                overflow.append(f"{w}px {route}: doc {doc_w}")

    # Sidebar collapse exercise
    page.set_viewport_size({"width": 1280, "height": 900})
    page.goto(BASE + "/academic/exams", wait_until="networkidle")
    trigger = page.locator("[data-sidebar='trigger']").first
    if trigger.count() > 0:
        trigger.click()
        page.wait_for_timeout(600)
        state = page.evaluate("document.body.getAttribute('data-sidebar') || ''")
        rail = page.evaluate("!!document.querySelector('[data-collapsible=docked], [data-collapsible=icon]')")
        page.screenshot(path="/tmp/render/sidebar-collapsed.png")
        trigger.click()
        page.wait_for_timeout(400)
        print("sidebar collapse exercised")

    # Key screenshots
    import os
    os.makedirs("/tmp/render", exist_ok=True)
    for name, (w, h) in SHOTS.items():
        page.set_viewport_size({"width": w, "height": h})
        route = {n: r for r, n in ROUTES}[name]
        page.goto(BASE + route, wait_until="networkidle")
        page.wait_for_timeout(350)
        page.screenshot(path=f"/tmp/render/{name}.png", full_page=(h > 1200))

    browser.close()

print("\nCONSOLE/PAGE ERRORS:", len(errors))
for e in errors[:12]:
    print(" ", e)
print("OVERFLOW FINDINGS:", len(overflow))
for o in overflow[:15]:
    print(" ", o)
