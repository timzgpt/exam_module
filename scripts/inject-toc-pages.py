#!/usr/bin/env python3
"""Two-pass page-number injection for the PRD's native TOC field.

Pass 1 (done outside): render the docx to PDF. This script reads the PDF text
per page, locates each heading's body page (PDF page minus the 2 front pages),
and injects the number as the cached result of each PAGEREF _TocN field so the
static PDF preview shows a fully numbered TOC. Word still refreshes on open
(dirty flag + updateFields), so correctness never depends on these values.
"""
import os
import re
import shutil
import subprocess
import sys
import zipfile

SRC = "/home/z/my-project/download/Josephian-PRD-Backend-Data-Integration.docx"
PDF = "/home/z/my-project/download/Josephian-PRD-Backend-Data-Integration.pdf"
TMP = "/tmp/prd-pagenum"
FRONT_PAGES = 2  # cover + TOC page precede body page 1

HEADINGS = [
    "1. Executive Summary",
    "2. Problem Statement",
    "2.1 Who has this problem",
    "2.2 Problem framing narrative (problem-statement skill)",
    "2.3 Evidence",
    "2.4 Final problem statement",
    "3. Target Users and Personas",
    "4. Strategic Context and Why Now",
    "5. Solution Overview",
    "5.1 What stays fixed",
    "6. Success Metrics",
    "7. User Stories and Requirements",
    "7.1 Epic hypothesis",
    "7.2 Story split (user-story and user-story-splitting skills)",
    "7.3 Story S1: Model the academic domain",
    "7.4 Story S2: Data access layer behind the existing seam",
    "7.5 Story S3: Context from real selections",
    "7.6 Story S4: Marks entry persists",
    "7.7 Story S5: Reports and verification from real data",
    "7.8 Story S6: Roles enforced server-side",
    "8. Out of Scope",
    "9. Dependencies and Risks",
    "10. Open Questions",
    "11. Self-Assessment",
]


def page_count(pdf):
    out = subprocess.run(["pdfinfo", pdf], capture_output=True, text=True).stdout
    return int(re.search(r"Pages:\s+(\d+)", out).group(1))


def page_text(pdf, page):
    return subprocess.run(
        ["pdftotext", "-f", str(page), "-l", str(page), "-layout", pdf, "-"],
        capture_output=True, text=True,
    ).stdout


def main():
    n = page_count(PDF)
    texts = {p: re.sub(r"\s+", " ", page_text(PDF, p)) for p in range(1, n + 1)}
    pages = {}
    for h in HEADINGS:
        needle = re.sub(r"\s+", " ", h)
        for p in range(FRONT_PAGES + 1, n + 1):
            if needle in texts[p]:
                pages[h] = p - FRONT_PAGES
                break
        else:
            print("WARN: heading not found in PDF:", h)
            pages[h] = None
    print("heading pages:", [pages[h] for h in HEADINGS])

    shutil.rmtree(TMP, ignore_errors=True)
    with zipfile.ZipFile(SRC) as z:
        z.extractall(TMP)
    doc_path = os.path.join(TMP, "word", "document.xml")
    xml = open(doc_path, encoding="utf-8").read()

    injected = 0
    for idx, h in enumerate(HEADINGS, start=1):
        page = pages[h]
        if page is None:
            continue
        # docx-js emits ONE run containing: begin, instrText PAGEREF _TocN,
        # separate, end. The cached result must be a bare <w:t> between the
        # separate and end tokens inside that same run.
        pat = re.compile(
            r'(<w:instrText[^>]*>\s*PAGEREF _Toc%d [^<]*</w:instrText>'
            r'<w:fldChar w:fldCharType="separate"/>)'
            r'<w:fldChar w:fldCharType="end"/>' % idx,
        )
        xml, n = pat.subn(
            r'\1<w:t xml:space="preserve">%d</w:t><w:fldChar w:fldCharType="end"/>' % page,
            xml,
        )
        injected += n

    open(doc_path, "w", encoding="utf-8").write(xml)
    print(f"injected page numbers: {injected}")

    new = "/tmp/prd-pn.docx"
    with zipfile.ZipFile(new, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(TMP):
            for f in files:
                full = os.path.join(root, f)
                z.write(full, os.path.relpath(full, TMP))
    shutil.move(new, SRC)
    print("repacked", SRC)


if __name__ == "__main__":
    sys.exit(main())
