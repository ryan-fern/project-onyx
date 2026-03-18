# Lock In Tracker

Track your daily goals, compute your Lock-In Score, and compete with friends on the leaderboard.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in values
3. `npm run db:push` to create the database
4. `npm run dev` to start

## Environment Variables

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Your app URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `DATABASE_URL` | SQLite file path (e.g. `file:./dev.db`) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `EMAIL_FROM` | From address for emails |
| `CRON_SECRET` | Secret for protecting the weekly report endpoint |

## Weekly Reports

POST `/api/weekly-report` with `Authorization: Bearer YOUR_CRON_SECRET` to trigger weekly emails.

Use Vercel Cron or similar to run every Monday:

```json
{
  "crons": [{
    "path": "/api/weekly-report",
    "schedule": "0 9 * * 1"
  }]
}
```

## Features

- **Daily Goals** — Set and check off goals for each day
- **Lock-In Score** — Completions / total goals * 100%
- **Friend System** — Send/accept friend requests by email
- **Leaderboard** — Trailing 7-day scores for you and friends
- **Weekly Email Reports** — Automated via API endpoint
