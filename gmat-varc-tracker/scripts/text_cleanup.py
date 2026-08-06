"""Normalize text extracted from the GMAT Official Guide PDF export."""

import re

_NUL_FIX = re.compile(r"\x00")


def fix_pdf_encoding(text: str) -> str:
    if not text:
        return ""
    text = text.replace("\u0000", "f")
    text = _NUL_FIX.sub("f", text)
    text = text.replace("\u00a0", " ")
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text.strip()


def strip_line_number_header(text: str) -> str:
    """Remove the PDF column of line numbers that appears before passage body text."""
    text = text.strip()
    text = re.sub(r"^Line\s*\n(?:\(\d+\)\s*\n)+", "", text, flags=re.IGNORECASE)
    return text.strip()


def reflow_paragraphs(text: str) -> str:
    """Turn hard-wrapped PDF lines into readable paragraphs."""
    text = strip_line_number_header(fix_pdf_encoding(text))
    if not text:
        return ""

    # Em-space at line start marks a new paragraph in the guide export.
    text = re.sub(r"\n\u2003", "\n\n", text)
    text = text.replace("\u2003", " ")

    chunks = re.split(r"\n\s*\n", text)
    paragraphs: list[str] = []

    for chunk in chunks:
        lines = []
        for line in chunk.split("\n"):
            line = line.strip()
            if not line or re.fullmatch(r"\(\d+\)", line):
                continue
            lines.append(line)
        if lines:
            paragraphs.append(" ".join(lines))

    if not paragraphs:
        lines = [
            ln.strip()
            for ln in text.split("\n")
            if ln.strip() and not re.fullmatch(r"\(\d+\)", ln.strip())
        ]
        if lines:
            paragraphs.append(" ".join(lines))

    return "\n\n".join(paragraphs)


def clean_question_text(text: str) -> str:
    return reflow_paragraphs(text)


_OPTION_BLEED = re.compile(
    r"\s+(?:Line\s*(?:\(\d+\)\s*)+|Questions[\s\t]+\d{3}[\s\t]+refer)",
    re.IGNORECASE,
)


def trim_option_bleed(text: str) -> str:
    """Drop passage text accidentally merged into the last answer choice."""
    if not text:
        return ""
    match = _OPTION_BLEED.search(text)
    if match:
        text = text[:match.start()]
    return text.strip()


def clean_option_text(text: str) -> str:
    text = fix_pdf_encoding(text)
    text = re.sub(r"\s*\n\s*", " ", text)
    text = trim_option_bleed(text)
    return re.sub(r" +", " ", text).strip()


def clean_stem_text(text: str) -> str:
    text = fix_pdf_encoding(text)
    text = re.sub(r"\s*\n\s*", " ", text)
    return re.sub(r" +", " ", text).strip()
