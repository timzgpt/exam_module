#!/usr/bin/env python3
"""Measure exact styling facts from the reference chart image."""
from PIL import Image
import math

im = Image.open("/home/z/my-project/upload/pasted_image_1793863899054.png").convert("RGB")
W, H = im.size
px = im.getpixel

def is_white(c): return c == (255, 255, 255)
def is_dark(c): return sum(c) < 200

# 1. fills of all 7 achieved (red) bars at y=250
print("=== achieved bar fills (y=250) ===")
y = 250
runs = []
prev = None
for x in range(60, W):
    c = px((x, y))
    redish = c[0] > 150 and c[1] < 130 and c[2] < 130
    if redish and prev is None:
        prev = x
    elif not redish and prev is not None:
        runs.append((prev, x - 1))
        prev = None
for a, b in runs:
    mid = (a + b) // 2
    print(f"  red bar x {a}..{b}  fill@mid {px((mid, y))}  fill@a+4 {px((a + 4, y))}")

# 2. plot box: left spine, bottom spine, top gridline, gridline color/extent
print("\n=== plot box ===")
# left spine: first dark column
for x in range(0, 200):
    if any(is_dark(px((x, yy))) for yy in range(50, 300, 7)):
        print(f"  left spine x={x}")
        break
# bottom spine: first dark row from below (above tick labels)
for yy in range(H - 150, 200, -1):
    row_dark = [x for x in range(80, W - 5, 3) if is_dark(px((x, yy)))]
    if len(row_dark) > 100:
        print(f"  bottom spine y={yy} (dark count {len(row_dark)})")
        break
# gridlines: scan column x=350 (gap between groups 1-2)
print("  gridlines at column x=350:")
col = [(yy, px((350, yy))) for yy in range(0, 330)]
for yy, c in col:
    if not is_white(c) and not is_dark(c) and abs(c[0] - c[1]) < 6 and abs(c[1] - c[2]) < 6 and c[0] < 250:
        print(f"    y={yy} color={c}")

# gridline extent at y=245 (the 25 line)
xs = [x for x in range(0, W) if px((x, 245)) != (255, 255, 255) and sum(px((x, 245))) > 300]
print(f"  gridline y=245 spans x {min(xs)}..{max(xs)}")

# right end of plot: max x of gridline or bar
print(f"  image right edge W={W}")

# 3. rotation angle of 'Arithmetic' label
print("\n=== x label rotation ===")
# label region under first tick: x 60..160, y 325..370 (approx)
pts = []
for yy in range(320, 380):
    for x in range(55, 175):
        if is_dark(px((x, yy))):
            pts.append((x, yy))
if pts:
    n = len(pts)
    mx = sum(p[0] for p in pts) / n
    my = sum(p[1] for p in pts) / n
    sxx = sum((p[0] - mx) ** 2 for p in pts) / n
    syy = sum((p[1] - my) ** 2 for p in pts) / n
    sxy = sum((p[0] - mx) * (p[1] - my) for p in pts) / n
    # PCA direction
    theta = 0.5 * math.atan2(2 * sxy, sxx - syy)
    print(f"  pts={n} centroid=({mx:.0f},{my:.0f}) angle={math.degrees(theta):.1f} deg (screen coords, +y down)")
    print(f"  x range {min(p[0] for p in pts)}..{max(p[0] for p in pts)}, y range {min(p[1] for p in pts)}..{max(p[1] for p in pts)}")

# 4. boldness: stroke thickness proxy — compare '% Percentage' vs a tick label
print("\n=== text boldness (dark px / bbox area) ===")
def darkfrac(box):
    r = im.crop(box)
    d = sum(1 for p in r.getdata() if sum(p) < 350)
    return d, d / (r.width * r.height)

# % Percentage vertical label around x 0..35, y 100..250
print(f"  y-axis label region (0,100,40,260): {darkfrac((0, 100, 40, 260))}")
# tick label '100' around x 20..65, y 10..35
print(f"  ytick '100' region (18,8,68,36): {darkfrac((18, 8, 68, 36))}")
# 'Subjects' label around y 385..410, x 480..620
print(f"  x-axis label region (470,380,640,415): {darkfrac((470, 380, 640, 415))}")
# value label '88' bold vs '78': 88 around (100,40,130,60)? find via scan
# legend text 'Achieved Marks' x 420..560, y 408..435
print(f"  legend text region (415,405,570,440): {darkfrac((415, 405, 570, 440))}")

# 5. legend geometry: swatch bounding boxes
print("\n=== legend swatches ===")
for target, name in [((231, 76, 60), "red"), ((52, 152, 219), "blue"), ((46, 204, 113), "green")]:
    best = None
    for yy in range(395, H):
        for x in range(300, 800):
            c = px((x, yy))
            if all(abs(c[i] - target[i]) <= 25 for i in range(3)):
                if best is None:
                    best = [x, yy, x, yy]
                else:
                    best[0] = min(best[0], x); best[1] = min(best[1], yy)
                    best[2] = max(best[2], x); best[3] = max(best[3], yy)
    print(f"  {name}: bbox={best} size={None if best is None else (best[2]-best[0]+1, best[3]-best[1]+1)}")

# 6. y-tick label positions (right-aligned): find '25','50','75','100' x extent
print("\n=== y tick label x extent (right edge should align) ===")
for name, yy0, yy1 in [("100", 5, 35), ("75", 82, 108), ("50", 157, 183), ("25", 232, 258), ("0", 305, 335)]:
    xs = [x for x in range(0, 70) for yy in range(yy0, yy1) if is_dark(px((x, yy)))]
    if xs:
        print(f"  {name}: x {min(xs)}..{max(xs)}")

# 7. bottom tick marks: dark pixels just below bottom spine
print("\n=== bottom ticks (y=spine+3) ===")
spine_y = None
for yy in range(H - 150, 200, -1):
    if len([x for x in range(80, W - 5, 3) if is_dark(px((x, yy)))]) > 100:
        spine_y = yy
        break
if spine_y:
    ticks = []
    prev = False
    for x in range(60, W):
        d = is_dark(px((x, spine_y + 4)))
        if d and not prev:
            ticks.append(x)
        prev = d
    print(f"  spine_y={spine_y}, tick starts at x: {ticks}")
