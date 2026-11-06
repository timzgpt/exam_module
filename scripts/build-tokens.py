#!/usr/bin/env python3
"""Build the Josephian DTCG token source and verify every pair with the kit's
validate_contrast.py, so the CSS theme in src/app/globals.css has a measured
token source rather than an asserted one.

Output: src/styles/josephian.tokens.json (DTCG, light + dark).
"""
import json
import subprocess
from pathlib import Path

KIT = Path("/home/z/my-project/skills/ux-ui-agent-skills")
OUT = Path("/home/z/my-project/src/styles/josephian.tokens.json")


def v(hexv):
    return {"$type": "color", "$value": hexv}


def lum(hexv):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(int(hexv.lstrip("#")[i:i + 2], 16)) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(fg, bg):
    a, b = lum(fg), lum(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def pick(cands, bg, minimum):
    for c in cands:
        if ratio(c, bg) >= minimum:
            return c
    raise SystemExit(f"no candidate reaches {minimum} on {bg}")


# --- light mode -------------------------------------------------------------
page_l, card_l = "#faf8f5", "#ffffff"
# Essential control border: warm stone, at least 3:1 on the page surface.
border_strong_l = pick(["#857d72", "#8a8377", "#90897e", "#78716c"], page_l, 3.0)
print("light border.strong =", border_strong_l, round(ratio(border_strong_l, page_l), 2))
print("light secondary on page =", round(ratio("#64748b", page_l), 2))

# --- dark mode --------------------------------------------------------------
page_d = "#17110f"
link_d = pick(["#c98a8f", "#d09aa0", "#b95c63", "#cf8f95"], page_d, 4.5)
border_strong_d = pick(["#9a938b", "#a39c94", "#8f887f"], page_d, 3.0)
print("dark link =", link_d, round(ratio(link_d, page_d), 2))
print("dark on-action on #a34a50 =", round(ratio("#fdf7f3", "#a34a50"), 2))
print("dark secondary #a8a29e on page =", round(ratio("#a8a29e", page_d), 2))

sem_light = {
    "$description": "Purpose-based tokens. Use these in designs and layouts",
    "text": {
        "primary": {"$type": "color", "$value": "{primitive.ink.900}"},
        "secondary": {"$type": "color", "$value": "{primitive.stone.500}"},
        "tertiary": {"$type": "color", "$value": "{primitive.stone.400}"},
        "link": {"$type": "color", "$value": "{primitive.burgundy.700}"},
        "on-action": {"$type": "color", "$value": "{primitive.cream.50}"},
    },
    "surface": {
        "page": {"$type": "color", "$value": "{primitive.cream.100}"},
        "card": {"$type": "color", "$value": "#ffffff"},
        "raised": {"$type": "color", "$value": "#ffffff"},
    },
    "border": {
        "default": {"$type": "color", "$value": "{primitive.stone.200}"},
        "strong": {"$type": "color", "$value": border_strong_l},
    },
    "action": {
        "primary": {"$type": "color", "$value": "{primitive.burgundy.700}"},
        "primary-hover": {"$type": "color", "$value": "{primitive.burgundy.800}"},
        "primary-active": {"$type": "color", "$value": "{primitive.burgundy.900}"},
        "secondary": {"$type": "color", "$value": "{primitive.cream.200}"},
        "destructive": {"$type": "color", "$value": "{primitive.red.600}"},
        "destructive-hover": {"$type": "color", "$value": "{primitive.red.700}"},
    },
    "feedback": {
        "success-text": {"$type": "color", "$value": "{primitive.green.800}"},
        "warning-text": {"$type": "color", "$value": "{primitive.amber.800}"},
        "error-text": {"$type": "color", "$value": "{primitive.red.700}"},
        "info-text": {"$type": "color", "$value": "{primitive.violet.800}"},
    },
}

dark = {
    "$description": "Dark mode semantic overrides, swapped at :root.dark",
    "text": {
        "primary": {"$type": "color", "$value": "{primitive.cream.50}"},
        "secondary": {"$type": "color", "$value": "{primitive.stone.400}"},
        "tertiary": {"$type": "color", "$value": "{primitive.stone.500}"},
        "link": {"$type": "color", "$value": link_d},
        "on-action": {"$type": "color", "$value": "{primitive.cream.50}"},
    },
    "surface": {
        "page": {"$type": "color", "$value": "{primitive.cocoa.950}"},
        "card": {"$type": "color", "$value": "{primitive.cocoa.900}"},
        "raised": {"$type": "color", "$value": "{primitive.cocoa.900}"},
    },
    "border": {
        "default": {"$type": "color", "$value": "#332a26"},
        "strong": {"$type": "color", "$value": border_strong_d},
    },
    "action": {
        "primary": {"$type": "color", "$value": "{primitive.burgundy.400}"},
        "destructive": {"$type": "color", "$value": "{primitive.red.500}"},
    },
}

data = {
    "$schema": "https://design-tokens.github.io/community-group/format/",
    "$description": "Josephian Schools token source. Mirrors the CSS custom "
                    "properties in src/app/globals.css; the CSS layer is the "
                    "runtime, this file is the measured source of truth.",
    "primitive": {
        "cream": {"50": v("#fdf7f3"), "100": v("#faf8f5"), "200": v("#f4ece8")},
        "stone": {"200": v("#e5e1dc"), "400": v("#a8a29e"), "500": v("#617081")},
        "ink": {"900": v("#202938")},
        "burgundy": {"400": v("#a34a50"), "700": v("#650f12"), "800": v("#4b0b0e"), "900": v("#3a080a")},
        "cocoa": {"900": v("#211816"), "950": v("#17110f")},
        "green": {"800": v("#116b3c")},
        "amber": {"800": v("#9a5f11")},
        "red": {"500": v("#ef4444"), "600": v("#dc2626"), "700": v("#b91c1c")},
        "violet": {"800": v("#5a3f8a")},
        "white": {"12": v("rgb(255 255 255 / 0.12)")},
    },
    "semantic": sem_light,
    "dark": dark,
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, indent=2) + "\n")
print("wrote", OUT)

r = subprocess.run(
    ["python3", str(KIT / "scripts/validate_contrast.py"), str(OUT)],
    capture_output=True, text=True,
)
print(r.stdout)
print(r.stderr)
raise SystemExit(r.returncode)
