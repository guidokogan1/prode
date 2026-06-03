# Mundial Pool — docs index

Read these in this order when picking the project back up:

1. **[SESSION-2026-06-03.md](./SESSION-2026-06-03.md)** — chronological log of the hardening session before launch. Start here if you're rejoining cold.
2. **[persistence-flow.md](./persistence-flow.md)** — the most fragile part of the app. Read before touching `submitTicket` or `SyncRetry`.
3. **[bugs-postmortem.md](./bugs-postmortem.md)** — every bug found and fixed. Don't reintroduce them.
4. **[cron-and-automation.md](./cron-and-automation.md)** — what runs when, how to debug. Includes football-data.org integration.
5. **[admin-endpoints.md](./admin-endpoints.md)** — reference for all `/api/admin/*` routes.
6. **[runbook.md](./runbook.md)** — daily monitoring + incident response procedures.
7. **[git-and-deploy.md](./git-and-deploy.md)** — the dual-GitHub-account trap (push as `guidokogan1`, dev as `guidokogan-bf`).
8. **[future-leagues.md](./future-leagues.md)** — UX + technical plan for the leagues feature if you ever ship it.

## Legacy docs (pre-2026-06-03)

These were written by earlier sessions / Codex. Still valid but superseded in places by the docs above.

- `prd.md` — original product requirements
- `data-model.md` — DB schema reference
- `handoff.md` — quick onboarding from an older session
- `operations.md` — older operational notes
- `backlog-mvp.md` — feature backlog
- `qa-checklist.md` — pre-launch QA list

## Quick links

| Need | Where |
|---|---|
| Live app | https://prode-indol.vercel.app |
| Repo | github.com/guidokogan1/prode |
| Supabase project | dashboard/project/fdquvrqwingrwdghenrm |
| GitHub Actions | github.com/guidokogan1/prode/actions |
| Vercel project | vercel.com/guidos-projects-96185957/prode |
| football-data.org docs | https://www.football-data.org/documentation/quickstart |

## High-level architecture in 60 seconds

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router on Vercel                    │
│                                                                      │
│  /matches  /ranking  /profile  /champion  /login  /register          │
│         │                                                            │
│         ▼                                                            │
│  app/api/...  ◄──── middleware (login gate, public routes only)      │
│         │                                                            │
│         ▼                                                            │
│  lib/product/supabase-provider.ts  ──► Supabase (Postgres + Storage) │
│         │                                                            │
│         └──► logPickEvent → pick_events (audit log, append-only)     │
│                                                                      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         GitHub Actions Crons                         │
│                                                                      │
│  cron-process-matches (5min) ─── POST /api/cron/process-all         │
│  cron-sync-scores (15min) ─────── POST /api/cron/sync-scores        │
│  cron-backup-picks (daily 4am) ── POST /api/cron/backup-picks       │
│  cron-settle-champion (6h) ────── POST /api/cron/settle-champion    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                             │
                             ▼ (sync-scores only)
                    football-data.org/v4/competitions/WC
```

## Core tables

| Table | Purpose | RLS |
|---|---|---|
| `users` | Display name + active flag | disabled (server-only access) |
| `app_private.user_credentials` | PIN hash (scrypt) | private schema |
| `app_private.user_sessions` | Session tokens (45-day expiry) | private schema |
| `teams` | 48 WC teams (fifa_code + flag URL) | disabled |
| `tournament_stages` | 7 stages (group, R32...final) | disabled |
| `matches` | All matches (group + knockout auto-inserted) | disabled |
| `match_markets` | Per-match betting market (1x2 or qualifies) | disabled |
| `market_outcomes` | home/draw/away/home_qualifies/away_qualifies | disabled |
| `tickets` | User's pick per market | disabled |
| `ticket_allocations` | Distribution of credits across outcomes | disabled |
| `settlements` | Per-match settlement result | disabled |
| `champion_market` | Pre-match futures bet for WC champion | disabled |
| `champion_picks` | User's WC champion choice | disabled |
| `leaderboard_snapshots` | Computed ranking | disabled |
| `pick_events` | **Append-only audit log** (independent of tickets) | enabled (deny all by default, service-role only) |

## Three commands you'll use most

```bash
# Pre-deploy check
cd ~/Downloads/prode-mundial-2026 && npx tsc -p tsconfig.typecheck.json --noEmit

# Health check
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/health" | jq

# Manual cron trigger
curl -H "Authorization: Bearer $CRON_SECRET" "https://prode-indol.vercel.app/api/cron/sync-scores" | jq
```
