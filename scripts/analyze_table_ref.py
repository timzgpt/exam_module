"""Pixel measurements from the report-card table reference image."""
from PIL import Image

im = Image.open("/home/z/my-project/upload/pasted_image_1793867010862.png").convert("RGB")
W, H = im.size


def bbox(x0, x1, y0, y1, label, thresh=120):
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = im.getpixel((x, y))
            if r < thresh and g < thresh:
                xs.append(x)
                ys.append(y)
    if xs:
        print(label, "bbox x", min(xs), max(xs), "y", min(ys), max(ys), "h=", max(ys) - min(ys) + 1)
    else:
        print(label, "none")


def darkest(x0, x1, y0, y1, label):
    best = None
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = im.getpixel((x, y))
            if best is None or (r + g + b) < sum(best):
                best = (r, g, b)
    print(label, "%02X%02X%02X" % best if best else None)


# subject name text boxes (maroon text)
bbox(110, 400, 118, 158, "Arithmetic text")
bbox(110, 400, 348, 388, "English text")
bbox(495, 545, 125, 158, "digit70")
bbox(755, 845, 125, 158, "digit88.00")
bbox(45, 80, 100, 128, "rownum1", 150)
print("mark digit color", "%02X%02X%02X" % im.getpixel((515, 141)))

# bar geometry: dark-ish (non-track) pixels along the bar center rows
for label, row in (("row1 bar", 157), ("row2 bar", 382)):
    xs = [x for x in range(100, 470) if sum(im.getpixel((x, row))) < 600]
    if xs:
        print(label, "x", min(xs), "to", max(xs))
    else:
        print(label, "none")
# bar height at x=200 (row1) and x=200 (row2)
for label, xc, y0, y1 in (("bar1", 200, 148, 172), ("bar2", 200, 373, 397)):
    ys = [y for y in range(y0, y1) if sum(im.getpixel((xc, y))) < 600]
    print(label, "ys", (min(ys), max(ys), "h=", max(ys) - min(ys) + 1) if ys else "none")

print("gradient row1 y=157:")
for x in range(116, 400, 20):
    print("  x=%3d %02X%02X%02X" % ((x,) + im.getpixel((x, 157))))
print("track1 @405", "%02X%02X%02X" % im.getpixel((405, 157)))
print("track2 @405", "%02X%02X%02X" % im.getpixel((405, 382)))

# comment block
print("comment bg", "%02X%02X%02X" % im.getpixel((600, 255)))
print("comment bar x=59..67 y=250:", ["%02X%02X%02X" % im.getpixel((x, 250)) for x in range(59, 68)])
darkest(110, 1100, 225, 290, "comment text darkest")
darkest(80, 106, 218, 248, "quote mark darkest")

# row separators: scan column x=600 for horizontal lines (darker than row bg)
prev = None
print("horizontal lines at x=600:")
for y in range(95, H - 5):
    c = im.getpixel((600, y))
    if sum(c) < 700 and all(990 < sum(im.getpixel((600, yy))) for yy in (y - 3, y + 3)) if 0 < y < H - 4 else False:
        print("  y=%d %02X%02X%02X" % ((y,) + c))

# table edges: leftmost/rightmost content columns (where row bg F3ECDD starts/ends at y=150)
row_y = 150
xs = [x for x in range(W) if im.getpixel((x, row_y)) == (243, 236, 221)]
print("row bg extent at y=150:", min(xs), max(xs))

# header extent: maroon at y=60
xs = [x for x in range(W) if im.getpixel((x, 60))[0] < 100 and im.getpixel((x, 60))[2] < 40]
print("header extent at y=60:", min(xs), max(xs))

# comment block horizontal extent at y=255 (bg F2EAD9)
xs = [x for x in range(W) if im.getpixel((x, 255)) == (242, 234, 217)]
print("comment bg extent at y=255:", min(xs), max(xs))

# vertical column boundaries in row area? check for white separators in rows at y=150
print("row1 sample colors across x @y=150:")
for x in range(100, 1180, 120):
    print("  x=%4d %02X%02X%02X" % ((x,) + im.getpixel((x, 150))))
