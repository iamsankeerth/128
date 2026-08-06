#!/usr/bin/env python3
"""Extract question stems, options, and RC passages from GMAT Official Guide PDF."""

import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
PDF_PATH = Path("/tmp/gdrive_test.pdf")
QUESTIONS_PATH = DATA / "questions.json"

MIN_Q, MAX_Q = 456, 801

EXPLANATION_STOP = re.compile(
    r"\n(?:Main\tIdea|Supporting\tIdea|Inference|Application|Evaluation|"
    r"Logical Structure|Argument Construction|Argument Evaluation|"
    r"Evaluation of a Plan|This question|The\tcorrect\tanswer\tis|"
    r"Correct\.|Strengthen|Weaken|Assumption|Roles of statements)",
    re.IGNORECASE,
)


def clean_export_noise(text: str) -> str:
    text = re.sub(r"23/\d{2}/\d{4}, \d{2}:\d{2}", "", text)
    text = re.sub(r"file:///[^\n]+", "", text)
    text = re.sub(r"To register for the GMAT™ exam, go to www\.mba\.com/register", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def truncate_before_explanations(text: str) -> str:
    """Verbal answer explanations start around section 8.8 in the PDF export."""
    markers = [
        r"\n8\.8\s+Answer\s+Explanations",
        r"\n8\.8\s+Practice\s+Questions",
        r"\nAnswer\s+Explanations:\s+Reading\s+Comprehension",
    ]
    cut = len(text)
    for marker in markers:
        match = re.search(marker, text)
        if match:
            cut = min(cut, match.start())
    return text[:cut]


def extract_pdf_text(reader: PdfReader, start_page: int, end_page: int) -> str:
    parts = []
    for i in range(start_page, min(end_page, len(reader.pages))):
        parts.append(reader.pages[i].extract_text() or "")
    text = clean_export_noise("\n".join(parts))
    return truncate_before_explanations(text)


def passage_set_first_questions(questions: dict) -> dict[str, int]:
    first: dict[str, int] = {}
    for meta in questions.values():
        passage_set = meta.get("passageSet")
        if passage_set and meta.get("section") == "Reading Comprehension":
            no = meta["no"]
            if passage_set not in first or no < first[passage_set]:
                first[passage_set] = no
    return first


def extract_passages(text: str) -> dict[int, str]:
    """Match practice-section refer lines only (not 'refer to the passage on page N')."""
    passages: dict[int, str] = {}
    pattern = re.compile(
        r"Questions[\s\t]+(\d{3})[–\-](\d{3})[\s\t]+refer[\s\t]+to[\s\t]+the[\s\t]+passage\.(?!\s*on)",
        re.IGNORECASE,
    )
    for match in pattern.finditer(text):
        first_q = int(match.group(1))
        last_q = int(match.group(2))
        if first_q in passages:
            continue
        before = text[max(0, match.start() - 8000):match.start()]
        line_matches = list(re.finditer(r"Line\s*\(\d+\)", before))
        if not line_matches:
            continue
        passage = before[line_matches[-1].start():].strip()
        passage = re.split(r"Questions[\s\t]+\d{3}", passage)[0].strip()
        for qnum in range(first_q, last_q + 1):
            passages[qnum] = passage
    return passages


def trim_question_block(block: str) -> str:
    match = EXPLANATION_STOP.search(block)
    if match:
        block = block[:match.start()]
    return block.strip()


def parse_options(block: str) -> tuple[str, dict[str, str]]:
    block = trim_question_block(block)
    opt_pattern = re.compile(r"(?:^|\n)([A-E])\.\s+")
    opt_matches = list(opt_pattern.finditer(block))
    options: dict[str, str] = {}
    if not opt_matches:
        return block.strip(), options

    stem = block[:opt_matches[0].start()].strip()
    for i, match in enumerate(opt_matches):
        letter = match.group(1)
        start = match.end()
        end = opt_matches[i + 1].start() if i + 1 < len(opt_matches) else len(block)
        option_text = block[start:end].strip()
        option_text = trim_question_block(option_text)
        options[letter] = option_text
    return stem, options


def extract_questions(text: str) -> dict[int, dict]:
    pattern = re.compile(r"(?:^|\n)(\d{3})\.\s+")
    matches = list(pattern.finditer(text))
    extracted: dict[int, dict] = {}
    seen: set[int] = set()

    for i, match in enumerate(matches):
        num = int(match.group(1))
        if num < MIN_Q or num > MAX_Q or num in seen:
            continue
        seen.add(num)

        start = match.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        block = text[match.start():end].strip()
        block = re.sub(r"^\d{3}\.\s+", "", block, count=1)
        stem, options = parse_options(block)
        extracted[num] = {
            "stem": stem,
            "options": options,
            "fullText": trim_question_block(block),
        }
    return extracted


def main() -> None:
    if not PDF_PATH.exists():
        print(f"Missing PDF at {PDF_PATH}", file=sys.stderr)
        sys.exit(1)
    if not QUESTIONS_PATH.exists():
        print(f"Missing {QUESTIONS_PATH}", file=sys.stderr)
        sys.exit(1)

    questions = json.loads(QUESTIONS_PATH.read_text())
    reader = PdfReader(str(PDF_PATH))
    text = extract_pdf_text(reader, 571, 837)
    passages = extract_passages(text)
    extracted = extract_questions(text)

    for qno, meta in questions.items():
        n = int(qno)
        if n in extracted:
            meta["stem"] = extracted[n]["stem"]
            meta["options"] = extracted[n]["options"]
            meta["fullText"] = extracted[n]["fullText"]
        if n in passages:
            meta["passage"] = passages[n]

    missing = [int(k) for k in questions if int(k) not in extracted]
    with_passage = sum(1 for q in questions.values() if q.get("passage"))
    with_options = sum(1 for q in questions.values() if q.get("options"))

    QUESTIONS_PATH.write_text(json.dumps(questions, indent=2, ensure_ascii=False))
    print(f"extracted={len(extracted)} missing={len(missing)} passage={with_passage} options={with_options}")
    if missing:
        print("missing:", missing[:30])

    q456 = questions["456"]
    print("456 passage start:", (q456.get("passage") or "")[:120])
    print("456 stem:", q456.get("stem", "")[:100])
    print("456 A:", (q456.get("options", {}).get("A") or "")[:80])


if __name__ == "__main__":
    main()
