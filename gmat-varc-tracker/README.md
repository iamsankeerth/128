# GMAT VARC Daily Tracker

A static web app for your **GMAT Official Guide 2024–2025** verbal study plan. It loads the daily schedule from your Excel sheet and gives you:

- **Per-question timers** — start, pause, resume, reset, and mark done
- **Daily study view** — browse Aug 6–31, 2026 by date
- **Progress tracking** — saved locally in your browser
- **Daily reminders** — browser notifications at a time you choose

## Data source

The schedule comes from `GMAT_VARC_Daily_Division_August_2026.xlsx`. Question metadata (section, difficulty, PDF pages) comes from `GMAT_VARC_Question_Index_August_2026.xlsx`.

## Run locally

```bash
cd gmat-varc-tracker
python3 -m http.server 8080
```

Open http://localhost:8080

> Use a local server (not `file://`) so notifications and the service worker work correctly.

## Regenerate data from Excel

Place the Excel files in `/tmp/` and run:

```bash
python3 scripts/generate_data.py
```

## Reminders

1. Click **Reminders** in the header
2. Choose a time and enable daily reminders
3. Allow browser notifications when prompted

Reminders fire once per day while the tab is open, or via the service worker when installed as a PWA.

## Deploy to Vercel

### Option A: Vercel Dashboard (easiest)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repo `iamsankeerth/128`
3. Set **Root Directory** to `gmat-varc-tracker`
4. Click **Deploy** (no build command needed — static site)

### Option B: Vercel CLI

```bash
cd gmat-varc-tracker
npx vercel --prod
```

### Option C: GitHub Actions (auto-deploy on push)

Add these repository secrets in GitHub → Settings → Secrets:

- `VERCEL_TOKEN` — from [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` — from Vercel project settings
- `VERCEL_PROJECT_ID` — from Vercel project settings

Pushes to `master` that change `gmat-varc-tracker/` will deploy automatically.
