#!/usr/bin/env python3
"""Analyze the user's reference chart image: crops + pixel sampling."""
from PIL import Image

SRC = "/home/z/my-project/upload/pasted_image_1793863899054.png"
OUT = "/tmp/render"
import os
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
W, H = im.size
print(f"size: {W}x{H}")

# ---- crops (zoom 3x, NEAREST) ----
crops = {
    "A_topleft": (0, 0, 340, 80),
    "B_topright": (800, 0, W, 130),
    "C_bottomleft": (40, 290, 520, H),
    "D_bottomright": (520, 290, W, H),
    "E_ylabel": (0, 60, 120, 320),
    "F_group1": (50, 0, 360, 320),
}
for name, box in crops.items():
    c = im.crop(box)
    c = c.resize((c.width * 3, c.height * 3), Image.NEAREST)
    c.save(f"{OUT}/{name}.png")
    print(f"saved {name} {box}")

# ---- pixel sampling ----
def px(x, y):
    return im.getpixel((x, y))

# scan for horizontal gridlines: pick a column between groups (few bars),
# e.g. x=340 (between Arithmetic and English groups) and count distinct row colors
col_x = 340
rows = {}
for y in range(0, H):
    r, g, b = px(col_x, y)
    if (r, g, b) != (255, 255, 255) and not (r < 60 and g < 60 and b < 60):
        rows.setdefault((r, g, b), []).append(y)
print("\nnon-white/non-black pixels in column x=340:")
for color, ys in sorted(rows.items(), key=lambda kv: -len(kv[1]))[:8]:
    print(f"  color {color}: {len(ys)} px, y range {min(ys)}..{max(ys)}")

# gridline color: sample inside plot away from bars, e.g. x=980 (past last group?)
print("\nrow scan y=130 (inside plot, expect gridline at 75?):")
run = []
for x in range(60, W):
    c = px(x, 130)
    if c != (255, 255, 255):
        run.append((x, c))
print(f"  non-white count: {len(run)}; first 10: {run[:10]}; last 5: {run[-5:]}")

# right spine? scan column x=W-2, W-6, W-12 for dark pixels
for x in (W - 2, W - 6, W - 12, W - 20):
    dark = [y for y in range(0, H) if sum(px(x, y)) < 200]
    print(f"\ncolumn x={x}: dark px count={len(dark)}", dark[:6], dark[-6:] if dark else "")

# top spine? scan row y=2, 6, 12
for y in (2, 6, 12, 20):
    dark = [x for x in range(0, W) if sum(px(x, y)) < 200]
    print(f"row y={y}: dark px count={len(dark)}", dark[:6], dark[-6:] if dark else "")

# left spine / axis label boldness: sample the '% Percentage' text region darkness
region = im.crop((0, 60, 60, 320))
dark_frac = sum(1 for p in region.getdata() if sum(p) < 380) / (region.width * region.height)
print(f"\ny-label region dark fraction: {dark_frac:.4f}")

# legend swatch colors: scan row near legend y for saturated colors
print("\nlegend row scan (find swatch colors):")
for y in range(H - 70, H, 6):
    cols = []
    for x in range(0, W):
        r, g, b = px(x, y)
        if max(r, g, b) - min(r, g, b) > 60:  # saturated
            cols.append((x, (r, g, b)))
    if cols:
        # compress consecutive
        groups = []
        prev = None
        for x, c in cols:
            if prev is None or x - prev[-1][0] > 3:
                groups.append([x, c])
            prev[-1] if False else None
            prev = (x, c) if False else prev
        # simpler: just print first x of each cluster
        clusters = []
        for x, c in cols:
            if clusters and x - clusters[-1][0] <= 4:
                clusters[-1] = (x, c)
            else:
                clusters.append((x, c))
        print(f"  y={y}: {[(x, c) for x, c in clusters][:8]}")
