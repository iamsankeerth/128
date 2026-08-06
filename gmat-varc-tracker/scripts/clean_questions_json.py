#!/usr/bin/env python3
"""Re-apply text cleanup to questions.json without re-parsing the PDF."""

import json
import sys
from pathlib import Path

from text_cleanup import clean_option_text, clean_question_text, clean_stem_text

DATA = Path(__file__).resolve().parents[1] / "data"
QUESTIONS_PATH = DATA / "questions.json"


def main() -> None:
    if not QUESTIONS_PATH.exists():
        print("Missing questions.json", file=sys.stderr)
        sys.exit(1)

    questions = json.loads(QUESTIONS_PATH.read_text())
    for meta in questions.values():
        if meta.get("passage"):
            meta["passage"] = clean_question_text(meta["passage"])
        if meta.get("stem"):
            meta["stem"] = clean_stem_text(meta["stem"])
        if meta.get("fullText"):
            meta["fullText"] = clean_stem_text(meta["fullText"])
        if meta.get("options"):
            meta["options"] = {k: clean_option_text(v) for k, v in meta["options"].items()}

    QUESTIONS_PATH.write_text(json.dumps(questions, indent=2, ensure_ascii=False))
    q = questions["456"]
    print("456 passage preview:", q["passage"][:200].replace("\n", " | "))
    print("456 A:", q["options"]["A"][:80])


if __name__ == "__main__":
    main()
