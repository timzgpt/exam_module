#!/usr/bin/env python3
"""Tokenize codemod for the Josephian redesign.

Maps the patterns the ux-ui-agent-skills gates flagged onto the token layer in
src/app/globals.css:

  1. Arbitrary hex utility classes   -> semantic token utilities
  2. Arbitrary px font sizes         -> the micro type scale tokens
  3. Arbitrary px widths/offsets     -> spacing-scale utilities
  4. Raw Tailwind palette classes     -> semantic tokens
  5. recharts fill="#hex" props      -> token fill utilities
  6. Em/en dashes in copy            -> hyphen (ranges), sentence split (prose)
  7. Native-select false positives    -> documented Radix exception marker

Usage: python3 scripts/tokenize-codemod.py [--dry-run]
"""
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/src")
DRY = "--dry-run" in sys.argv

# ---------------------------------------------------------------- mappings

HEX_TOKEN = {
    "#650f12": "primary",
    "#4b0b0e": "burgundy-dark",
    "#16834a": "success",
    "#116b3c": "success-strong",
    "#3d7d2f": "grade-b",
    "#35682a": "grade-b-strong",
    "#c47a16": "warning",
    "#9a5f11": "warning-strong",
    "#b05c1c": "grade-d",
    "#96491a": "grade-d-strong",
    "#b3352e": "grade-e",
    "#a02a25": "grade-e-strong",
    "#dc2626": "destructive",
    "#b91c1c": "destructive-strong",
    "#6b4f9e": "info",
    "#5a3f8a": "info-strong",
    "#faf8f5": "background",
}

TYPE_MAP = {
    "10px": "text-3xs", "10.5px": "text-3xs",
    "11px": "text-2xs", "11.5px": "text-2xs",
    "12px": "text-xs", "12.5px": "text-xs",
    "13px": "text-compact", "13.5px": "text-compact",
}

WIDTH_MAP = {
    "w-[220px]": "w-55", "w-[200px]": "w-50", "w-[190px]": "w-48",
    "w-[160px]": "w-40", "w-[150px]": "w-38", "w-[140px]": "w-35",
    "w-[260px]": "w-65", "w-[100px]": "w-25", "h-[5px]": "h-1",
    "max-w-[1400px]": "max-w-page", "max-w-[420px]": "max-w-toast",
    "max-w-[820px]": "max-w-205",
    "min-w-[240px]": "min-w-60", "min-w-[180px]": "min-w-45",
    "min-w-[170px]": "min-w-42",
    "max-h-[300px]": "max-h-75",
    "lg:max-h-[calc(100vh-320px)]": "lg:max-h-[calc(100vh-(var(--spacing)*80))]",
    "-left-[25px]": "-left-6",
}

# Chart config JS values: recharts reads these as SVG paints and the shadcn
# chart style block resolves var() fills.
CHART_VAR = {
    '"#650f12"': '"var(--primary)"',
    '"#16834a"': '"var(--success)"',
    '"#c47a16"': '"var(--warning)"',
}

PALETTE_MAP = {
    "text-neutral-500": "text-muted-foreground",
    "text-neutral-600": "text-muted-foreground",
    "text-neutral-700": "text-foreground/80",
    "text-neutral-900": "text-foreground",
    "border-neutral-300": "border-border",
    "border-neutral-400": "border-input",
    "border-neutral-500": "border-foreground/30",
    "bg-neutral-300": "bg-muted",
    # Vendored toast destructive close button: white-on-destructive intent.
    "text-red-300": "text-destructive-foreground/80",
    "text-red-50": "text-destructive-foreground",
    "ring-red-400": "ring-destructive-foreground/40",
    "ring-offset-red-600": "ring-offset-destructive",
}

VENDORED_MAP = {
    "ring-[3px]": "ring-3",
    "rounded-[2px]": "rounded-xs",
    "translate-y-[2px]": "translate-y-0.5",
    "translate-x-[calc(100%-2px)]": "translate-x-[calc(100%-(var(--spacing)*0.5))]",
    "+2px)]": "+(var(--spacing)*0.5))]",
}

# Class utility prefix that can carry a color: text/bg/border/... plus variant
# prefixes like "hover:" or "group-[.destructive]:".
CLASS_RE = re.compile(
    r"((?:[A-Za-z][\w\-\[\]./]*:)*)"
    r"(bg|text|border|ring|ring-offset|fill|stroke|from|via|to|divide|outline|decoration|accent|caret|placeholder|shadow)"
    r"-\[?(" + "|".join(re.escape(h) for h in sorted(HEX_TOKEN, key=len, reverse=True)) + r")\]?"
    r"(/(\d{1,3}))?"
)
FILL_PROP_RE = re.compile(
    r'fill="(' + "|".join(re.escape(h) for h in HEX_TOKEN) + r')"'
)
TYPE_RE = re.compile(r"((?:[A-Za-z][\w\-\[\]./]*:)*)text-\[(%s)\]" % "|".join(re.escape(k) for k in TYPE_MAP))
WIDTH_RE = re.compile(
    r"((?:[A-Za-z][\w\-\[\]./]*:)*)(" + "|".join(re.escape(k) for k in WIDTH_MAP) + r")"
)
PALETTE_RE = re.compile(
    r"((?:[A-Za-z][\w\-\[\]./]*:)*)(" + "|".join(re.escape(k) for k in PALETTE_MAP) + r")\b"
)
VENDORED_RE = re.compile(
    r"(" + "|".join(re.escape(k) for k in VENDORED_MAP) + r")"
)
RANGE_RE = re.compile(r"(\d)\s*[–]\s*(\d)")
LETTER_RANGE_RE = re.compile(r"\b([A-F])–([A-F])\b")
PLACEHOLDER_RE = re.compile(r'(?<![>\w])"—"(?![\w])')
PROSE_RE = re.compile(r"([^\s])[ ]*[—–][ ]+(\S*)")
SKIP_DIRS = {"node_modules"}


def cap_after(m):
    """Sentence split: ' — ' becomes '. ' with the next word capitalized."""
    left, right = m.group(1), m.group(2)
    if right.startswith(("$", "{")):
        return f"{left}: {right}"
    nxt = right[0].upper() + right[1:] if right and right[0].isalpha() else right
    return f"{left}. {nxt}"


def is_comment(line):
    s = line.strip()
    return s.startswith(("//", "*", "/*", "{/*", "<!--"))


SELECT_RE = re.compile(r"<Select\s")


def rewrite(text, path):
    hits = {"hex": 0, "type": 0, "width": 0, "palette": 0, "vendored": 0,
            "fill": 0, "range": 0, "placeholder": 0, "prose": 0, "select": 0}
    out_lines = []
    for line in text.splitlines(keepends=True):
        eol = "\n" if line.endswith("\n") else ""
        body = line.rstrip("\n")
        orig = body

        def hex_sub(m):
            hits["hex"] += 1
            op = m.group(2)
            token = HEX_TOKEN[m.group(3)]
            alpha = f"/{m.group(4)}" if m.group(4) else ""
            return f"{m.group(1)}{op}-{token}{alpha}"

        body = CLASS_RE.sub(hex_sub, body)

        def fill_sub(m):
            hits["fill"] += 1
            return 'className="fill-%s"' % HEX_TOKEN[m.group(1)]

        body = FILL_PROP_RE.sub(fill_sub, body)

        def type_sub(m):
            hits["type"] += 1
            return f"{m.group(1)}{TYPE_MAP[m.group(2)]}"

        body = TYPE_RE.sub(type_sub, body)

        def width_sub(m):
            hits["width"] += 1
            key = m.group(2)
            return f"{m.group(1)}{WIDTH_MAP[key]}"

        body = WIDTH_RE.sub(width_sub, body)

        def pal_sub(m):
            hits["palette"] += 1
            return f"{m.group(1)}{PALETTE_MAP[m.group(2)]}"

        body = PALETTE_RE.sub(pal_sub, body)

        for raw, var in CHART_VAR.items():
            if raw in body:
                body = body.replace(raw, var)
                hits["hex"] += 1

        if True:
            def ven_sub(m):
                hits["vendored"] += 1
                return VENDORED_MAP[m.group(1)]

            body = VENDORED_RE.sub(ven_sub, body)

        # Em/en dash passes. Comments first, then prose, then ranges.
        if "—" in body or "–" in body:
            if is_comment(body):
                body = body.replace(" — ", ": ").replace("— ", ": ")
                if "—" in body or "–" in body:
                    body = body.replace(" — ", ": ").replace("–", "-")
            body = RANGE_RE.sub(r"\1-\2", body)
            body = LETTER_RANGE_RE.sub(r"\1-\2", body)
            body = PLACEHOLDER_RE.sub('"-"', body)
            # Curated joiners that read better as a comma clause.
            body = body.replace("(overdue — due ", "(overdue, due ")
            body = re.sub(r"-—", "-", body)
            new = PROSE_RE.sub(cap_after, body)
            if new != body:
                hits["prose"] += 1
            body = new
            # Any residue: standalone dash pair inside string continuation.
            body = body.replace("` — ", "`: ")

        # Documented exception: shadcn Select is a Radix listbox, not a native
        # select. The gate regex cannot tell JSX components apart.
        if "components/shell/app-header.tsx" in str(path) and SELECT_RE.search(body) and "ds-allow-native-select" not in body:
            body = body + " {/* ds-allow-native-select: Radix listbox trigger */}"
            hits["select"] += 1

        if body != orig:
            hits["changed"] = hits.get("changed", 0) + 1
        out_lines.append(body + eol)
    return "".join(out_lines), hits


def main():
    total = {}
    files = [p for p in ROOT.rglob("*") if p.is_file() and p.suffix in {".tsx", ".ts", ".css"}]
    for path in sorted(files):
        text = path.read_text(encoding="utf-8")
        new, hits = rewrite(text, path)
        for k, v in hits.items():
            total[k] = total.get(k, 0) + v
        if new != text:
            print(f"changed {path.relative_to(ROOT.parent)}: "
                  + ", ".join(f"{k}={v}" for k, v in hits.items() if v))
            if not DRY:
                path.write_text(new, encoding="utf-8")
    print("TOTALS:", ", ".join(f"{k}={v}" for k, v in sorted(total.items())))


if __name__ == "__main__":
    main()
