#!/usr/bin/env python3
"""
Strip the docx-js cached first TOC entry from the TableOfContents field paragraph.

docx-js emits the TOC field as one paragraph: begin + instrText + separate + a
cached hyperlink entry. add_toc_placeholders.py then inserts the real placeholder
entries as sibling paragraphs between separate and end. The cached hyperlink makes
the first heading render twice. This script removes that cached hyperlink, leaving
begin + instrText + separate in the field paragraph, so only the placeholder
entries (which Word replaces on field update) are visible.
"""
import re
import shutil
import sys
import zipfile
from pathlib import Path


def fix(docx_path: str) -> None:
    src = Path(docx_path)
    tmp = src.with_suffix(".tmp.docx")
    with zipfile.ZipFile(src) as zin:
        names = zin.namelist()
        doc = zin.read("word/document.xml").decode("utf-8")

        # The TOC field paragraph: contains begin fldChar and a TOC instrText.
        para_re = re.compile(r"<w:p>(?:(?!</w:p>).)*?TOC \\(?:(?!</w:p>).)*?</w:p>", re.S)
        m = para_re.search(doc)
        if not m:
            print("WARNING: TOC field paragraph not found; nothing changed")
            return
        para = m.group(0)
        if "<w:hyperlink" not in para:
            print("OK: no cached hyperlink in TOC field paragraph")
            return
        fixed_para = re.sub(r"<w:hyperlink.*?</w:hyperlink>", "", para, flags=re.S)
        doc = doc[: m.start()] + fixed_para + doc[m.end():]

        with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
            for name in names:
                if name == "word/document.xml":
                    zout.writestr(name, doc)
                else:
                    zout.writestr(name, zin.read(name))
    shutil.move(tmp, src)
    print("Fixed: removed cached TOC entry from field paragraph")


if __name__ == "__main__":
    fix(sys.argv[1])
