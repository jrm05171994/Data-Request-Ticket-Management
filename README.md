# Koda Data Request Ticketing System

Internal tool for Koda Health employees to submit, track, and manage data analyst requests.
"Jira-lite" with Slack integration and a priority scoring engine.

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- Supabase (Postgres + Auth via Google OAuth)
- Tailwind CSS
- Slack via `@slack/bolt`
- Vercel hosting

## Build phases

This repo is being built in phases per the project spec. Status:

- [x] Phase 1 — repo scaffold, Supabase schema, RLS, scoring engine, seed
- [ ] Phase 2 — Google OAuth login flow
- [ ] Phase 3 — Requester view (New Request form + Request Status)
- [ ] Phase 4 — Admin Queue
- [ ] Phase 5 — Priority scoring config UI
- [ ] Phase 6 — Admin analytics dashboard
- [ ] Phase 7 — Admin Users + Scoring Config panels
- [ ] Phase 8 — Slack `/submit-request` modal intake
- [ ] Phase 9 — Slack `#alerts-client-data` auto-ticket listener
- [ ] Phase 10 — Slack DM stage-change notifications
- [ ] Phase 11 — Vercel deploy

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

App runs on http://localhost:3000.

## Database migrations

SQL migrations live in `supabase/migrations/`. Run them in order against your
Supabase project — either via the Supabase Dashboard SQL editor (paste each
file's contents) or via the Supabase CLI (`supabase db push`).

## Environment variables

See `.env.example`. Real values go in `.env.local` (gitignored).
