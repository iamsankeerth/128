# Daily answer keys

This folder is updated automatically by GitHub Actions each day during your study plan.

- **Schedule:** 00:30 UTC daily (~6:00 AM IST)
- **Workflow:** `.github/workflows/daily-answers.yml`
- **Format:** One markdown file per study day (`YYYY-MM-DD.md`) with correct answers for that day's assigned questions

## Manual generation

```bash
cd gmat-varc-tracker
python3 scripts/generate_daily_answers.py              # today
python3 scripts/generate_daily_answers.py --date 2026-08-06
python3 scripts/generate_daily_answers.py --all      # entire August plan
```

## Your selected answers

If you enable **GitHub sync** in the tracker app, your chosen answers are saved to `progress/YYYY-MM-DD.json` in this repo when you practice.
