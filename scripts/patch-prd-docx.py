#!/usr/bin/env python3
"""Post-process the generated PRD docx (after add_toc_placeholders.py):

1. Remove empty <w:pgNumType/> from the cover section (WPS compatibility).
2. Deduplicate TOC placeholder entries where add_toc_placeholders.py emitted
   the same heading twice (a hyperlink/PAGEREF paragraph with an empty cached
   result followed by a plain entry with a page number).
3. Patch footer PAGE fields with explicit \\* ROMAN / \\* arabic switches
   (WPS ignores pgNumType fmt).
"""
import os
import re
import shutil
import sys
import zipfile

SRC = "/home/z/my-project/download/Josephian-PRD-Backend-Data-Integration.docx"
TMP = "/tmp/prd-patch"


def para_blocks(xml):
    return list(re.finditer(r"<w:p\b.*?</w:p>", xml, re.S))


def visible_text(p_xml):
    return "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p_xml))


def main():
    shutil.rmtree(TMP, ignore_errors=True)
    with zipfile.ZipFile(SRC) as z:
        z.extractall(TMP)

    doc_path = os.path.join(TMP, "word", "document.xml")
    xml = open(doc_path, encoding="utf-8").read()

    # 1. empty pgNumType
    xml, n_pg = re.subn(r"<w:pgNumType/>", "", xml)

    # 2. dedupe TOC entries: a paragraph holding a PAGEREF field whose visible
    #    text matches the NEXT paragraph's entry text (which additionally ends
    #    with a page number) is the empty-result duplicate emitted first.
    removed = 0
    blocks = para_blocks(xml)
    drop = set()

    def entry_key(t):
        t = t.strip()
        return t[:-len(t.lstrip())] if False else t

    def norm(t):
        return re.sub(r"[\s\d]+$", "", t.strip())  # drop trailing page number

    for i, m in enumerate(blocks[:-1]):
        if "PAGEREF" not in m.group(0):
            continue
        cur = norm(visible_text(m.group(0)))
        nxt = norm(visible_text(blocks[i + 1].group(0)))
        if cur and cur == nxt:
            drop.add(i)
    if drop:
        out, last = [], 0
        for i, m in enumerate(blocks):
            if i in drop:
                out.append(xml[last:m.start()])
                last = m.end()
                removed += 1
            elif i == len(blocks) - 1:
                pass
        out.append(xml[last:])
        xml = "".join(out)

    open(doc_path, "w", encoding="utf-8").write(xml)
    print(f"pgNumType removed: {n_pg}, duplicate TOC entries removed: {removed}")

    # 2b. settings.xml: updateFields=true so Word refreshes the TOC on open
    settings_path = os.path.join(TMP, "word", "settings.xml")
    if os.path.exists(settings_path):
        sxml = open(settings_path, encoding="utf-8").read()
        if "w:updateFields" not in sxml:
            sxml = sxml.replace(
                "<w:settings",
                '<w:settings',
                1,
            )
            sxml = re.sub(
                r"(<w:settings[^>]*>)",
                r'\1<w:updateFields w:val="true"/>',
                sxml,
                count=1,
            )
            open(settings_path, "w", encoding="utf-8").write(sxml)
            print("settings.xml: updateFields=true added")

    # 3. footer format switches
    rels = open(os.path.join(TMP, "word", "_rels", "document.xml.rels"), encoding="utf-8").read()
    id2file = dict(re.findall(r'Id="(rId\d+)"[^>]*Target="(footer\d+\.xml)"', rels))
    fmt_for_ref = {}
    for m in re.finditer(r"<w:sectPr.*?</w:sectPr>|<w:sectPr[^>]*/>", xml, re.S):
        fmt = re.search(r'w:pgNumType[^/]*w:fmt="([^"]+)"', m.group(0))
        for rid in re.findall(r'w:footerReference[^>]*r:id="(rId\d+)"', m.group(0)):
            if fmt:
                fmt_for_ref[rid] = fmt.group(1)
    for rid, fname in id2file.items():
        fpath = os.path.join(TMP, "word", fname)
        fxml = open(fpath, encoding="utf-8").read()
        fmt = fmt_for_ref.get(rid, "decimal")
        switch = "ROMAN" if "oman" in fmt or "ROMAN" in fmt else "arabic"
        fxml, n = re.subn(
            r"(<w:instrText[^>]*>)\s*PAGE\s*(</w:instrText>)",
            rf"\1 PAGE \\* {switch} \\* MERGEFORMAT \2",
            fxml)
        open(fpath, "w", encoding="utf-8").write(fxml)
        print(f"{fname}: {n} field(s) -> {switch}")

    new = "/tmp/prd-patched.docx"
    with zipfile.ZipFile(new, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(TMP):
            for f in files:
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, TMP))
    shutil.move(new, SRC)
    print("repacked", SRC)


if __name__ == "__main__":
    sys.exit(main())
