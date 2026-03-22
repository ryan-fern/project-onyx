# Lock-In Tracker

A personal accountability app for tracking daily, weekly, and monthly goals. Set your goals, check them off each day, and compete with friends on the leaderboard.

## Features

- **Goal Tracking** — Create daily, weekly, and monthly goals and check them off as you complete them
- **Lock-In Score** — Your daily completion percentage (goals completed / goals set × 100)
- **Streaks** — Consecutive days with 100% completion
- **Calendar Heatmap** — Visual history of your daily scores by month
- **Backfill Past Days** — Click any past day on the calendar to retroactively log completions
- **Leaderboard** — Compare your trailing 7-day score and streak against friends
- **Friend System** — Send and accept friend requests by email
- **Email Notifications** — Weekly digest and daily reminders via Resend

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://www.prisma.io/)
- [NextAuth](https://next-auth.js.org/) (credentials-based auth)
- [Tailwind CSS](https://tailwindcss.com/)
- [Resend](https://resend.com/) (transactional email)
- [Sonner](https://sonner.emilkowal.ski/) (toast notifications)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `NEXTAUTH_URL` | Your app URL (e.g. `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `DATABASE_URL` | PostgreSQL connection string (pooled) |
| `DIRECT_URL` | PostgreSQL direct connection string (for migrations) |
| `RESEND_API_KEY` | Resend API key for sending emails |
| `EMAIL_FROM` | From address for emails |
| `CRON_SECRET` | Secret for protecting cron endpoints |

### 3. Push the database schema

```bash
npm run db:push
```

### 4. Start the dev server

```bash
npm run dev
```

## Cron Jobs

Two scheduled jobs run automatically when deployed on Vercel (configured in `vercel.json`):

| Endpoint | Schedule | Purpose |
|---|---|---|
| `/api/weekly-report` | Mondays at 9am UTC | Sends weekly digest emails |
| `/api/daily-reminder` | Daily at 12pm UTC | Sends daily reminder emails |

To trigger manually, send a `POST` request with `Authorization: Bearer YOUR_CRON_SECRET`.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Sync Prisma schema to database
npm run db:studio    # Open Prisma Studio (database GUI)
```
