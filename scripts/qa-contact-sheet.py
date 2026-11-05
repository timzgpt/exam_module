#!/usr/bin/env python3
"""Combine QA screenshots into 2x2 contact sheets for efficient review."""
from PIL import Image, ImageDraw
from pathlib import Path

SRC = Path("/tmp/qa/pages")
OUT = Path("/tmp/qa")
CELL_W, CELL_H = 720, 450
LABEL_H = 26

pages = sorted(SRC.glob("*.png"))
print(f"{len(pages)} pages found")

sheets = [pages[i:i+4] for i in range(0, len(pages), 4)]
for si, group in enumerate(sheets, 1):
    W, H = CELL_W * 2, (CELL_H + LABEL_H) * 2
    sheet = Image.new("RGB", (W, H), "#dddddd")
    draw = ImageDraw.Draw(sheet)
    for i, p in enumerate(group):
        col, row = i % 2, i // 2
        x, y = col * CELL_W, row * (CELL_H + LABEL_H)
        draw.rectangle([x, y, x + CELL_W, y + LABEL_H], fill="#202938")
        draw.text((x + 8, y + 6), p.stem, fill="#ffffff")
        img = Image.open(p).convert("RGB").resize((CELL_W, CELL_H), Image.LANCZOS)
        sheet.paste(img, (x, y + LABEL_H))
    out = OUT / f"sheet-{si}.png"
    sheet.save(out)
    print(f"saved {out} with {[p.stem for p in group]}")
