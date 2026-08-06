#!/usr/bin/env python3
"""Generate a markdown answer key for one study day."""

import argparse
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ANSWERS = ROOT / "answers"


def load_data() -> tuple[dict, dict]:
    questions = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
    daily_plan = json.loads((DATA / "daily-plan.json").read_text(encoding="utf-8"))
    return questions, daily_plan


def find_day(daily_plan: dict, target_date: str) -> dict | None:
    for day in daily_plan.get("days", []):
        if day.get("date") == target_date:
            return day
    return None


def format_question_section(meta: dict) -> str:
    qno = meta["no"]
    section = meta.get("section", "")
    difficulty = meta.get("difficulty", "")
    stem = meta.get("stem") or "—"
    correct = meta.get("correctAnswer", "?")
    options = meta.get("options") or {}

    lines = [
        f"### Q{qno} ({section} · {difficulty})",
        "",
        f"**Question:** {stem}",
        "",
    ]

    for letter in ["A", "B", "C", "D", "E"]:
        text = options.get(letter)
        if not text:
            continue
        marker = "**→**" if letter == correct else ""
        lines.append(f"- {letter}. {text} {marker}".rstrip())

    correct_text = options.get(correct, "")
    lines.extend(["", f"**Correct answer: {correct}**"])
    if correct_text:
        lines.append(f"_{correct_text}_")
    lines.append("")
    return "\n".join(lines)


def generate_markdown(target_date: str, questions: dict, day: dict) -> str:
    label = day.get("label", target_date)
    rc_count = day.get("rcCount", 0)
    cr_count = day.get("crCount", 0)
    total = day.get("total", len(day.get("questionNumbers", [])))
    passage_sets = day.get("passageSets")

    header = [
        f"# GMAT VARC Answers — {label} ({target_date})",
        "",
        f"{total} questions: {rc_count} RC + {cr_count} CR",
    ]
    if passage_sets:
        header.append(f"Passages: {passage_sets}")
    header.extend(["", "_Auto-generated from the Official Guide question index._", "", "---", ""])

    body = []
    for qno in day.get("questionNumbers", []):
        meta = questions.get(str(qno)) or questions.get(qno)
        if meta:
            body.append(format_question_section(meta))
        else:
            body.append(f"### Q{qno}\n\nQuestion data not found.\n\n")

    return "\n".join(header + body)


def write_daily_answers(target_date: str, force: bool = False) -> Path | None:
    questions, daily_plan = load_data()
    day = find_day(daily_plan, target_date)
    if not day:
        print(f"No study plan for {target_date}", file=sys.stderr)
        return None

    ANSWERS.mkdir(parents=True, exist_ok=True)
    out_path = ANSWERS / f"{target_date}.md"
    if out_path.exists() and not force:
        print(f"Already exists: {out_path}")
        return out_path

    content = generate_markdown(target_date, questions, day)
    out_path.write_text(content, encoding="utf-8")
    print(f"Wrote {out_path}")
    return out_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate daily GMAT VARC answer key markdown")
    parser.add_argument("--date", help="Study date (YYYY-MM-DD). Defaults to today.")
    parser.add_argument("--all", action="store_true", help="Generate files for every day in the plan")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files")
    args = parser.parse_args()

    if args.all:
        _, daily_plan = load_data()
        for day in daily_plan.get("days", []):
            write_daily_answers(day["date"], force=args.force)
        return

    target = args.date or date.today().isoformat()
    path = write_daily_answers(target, force=args.force)
    if not path:
        print(f"Skipped — no study plan for {target}")
        return


if __name__ == "__main__":
    main()
