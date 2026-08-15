# Prode LPF — project context (read this first)

This repo was born as a **World Cup 2026** football pool and was **re-targeted to the Argentine Liga (Torneo Clausura 2026 — "LPF")** on 2026-07-27. The folder is still named `prode-mundial-2026` for git-history reasons; the product is now the LPF.

## What it is

Mobile-first pari-mutuel prode for a group of friends. Each user makes a single **all-in** pick per match on 1X2 (or "qualifies" in playoffs) — the full credit (`MATCH_CREDIT` = 10000, `KNOCKOUT_CREDIT` = 15000) goes on the chosen outcome; winners split the pool. Since 2026-07-28 there's no soft/medium/hard split anymore (removed — too much friction across ~190 Liga matches). There's also a season-long **champion pick**. Next.js (app router) + Supabase + Vercel.

- **Live:** `prode-indol.vercel.app` — Vercel project **prode**, account "Guido's projects" (Hobby), **not** the BenefitFlow team.
- **Repo:** `github.com/guidokogan1/prode` (Guido's personal account, NOT BF).
- **Push procedure:** `gh auth switch -u guidokogan1` → push → `gh auth switch -u guidokogan-bf` to switch back. NEVER open PRs / push without Guido's explicit OK.
- **Local dev:** `PORT=3100 pnpm dev` (port 3000 may be taken). Gate before committing is `pnpm typecheck` (some `pnpm test` failures are pre-existing supabase-mock noise, ~11/63, identical on main).
- **Running DB/ops scripts:** the `scripts/*.mjs` read `process.env` directly with no dotenv loader, so run them with `node --env-file=.env.local scripts/<x>.mjs` (Node 22+). These ops/audit scripts stay **untracked** by convention (only `seed-*` and `process-*` are wired into package.json).

## Data source (Argentine Liga)

ESPN hidden API, league `arg.1`, season slug `torneo-clausura`:
- Scoreboard (fixtures + live/finished): `https://site.api.espn.com/apis/site/v2/sports/soccer/arg.1/scoreboard?dates=YYYYMMDD-YYYYMMDD&limit=400`
- Standings (2 zones, live): `https://site.api.espn.com/apis/v2/sports/soccer/arg.1/standings?season=2026` → `children` = Group A / Group B (the two zonas), each with `advanced` flag + points.
- Team logos (escudos): `https://a.espncdn.com/i/teamlogos/soccer/500/{espnId}.png`
- **Gotcha:** ESPN reuses abbreviation `RIV` for BOTH River Plate (id 16) and Independiente Rivadavia (id 9744). Everything keys by **ESPN numeric team id**, never abbreviation. Disambiguated DB codes: River=`RIV`, Ind. Rivadavia=`RIVM`.

Tournament format (2026): 30 teams, 2 zonas of 15, 16-fecha regular phase, then playoffs (octavos→final, top 8 of each zone) + champion.

## Supabase

- **Project:** `prode-liga`, ref `qohwzsmuihpfaoywsmjv`, URL `https://qohwzsmuihpfaoywsmjv.supabase.co`, region São Paulo (sa-east-1), org "Guido Workspace" (FREE).
- **Uses the LEGACY JWT API keys** (anon + service_role, `eyJ…`), NOT the new `sb_publishable_`/`sb_secret_` keys — the new keys gave intermittent `PGRST303 "JWT issued at future"`. Legacy JWTs (iat in the past) are stable.
- `app_private` schema is **exposed** in the Data API (Settings → API → Exposed schemas) — the app reads sessions/credentials from it; without it you get `PGRST106`.
- Keys live in `.env.local` (local, gitignored) and the Vercel project env (deploy). **Not in this repo.**
- The old **World Cup** data lives in a *different* Supabase project (untouched). The Liga DB started empty — every user registers fresh (Mundial accounts were not migrated).
- Free tier: 5 GB egress **shared** with the old Mundial project. Supabase free *restricts* (stops serving) rather than billing, but exhaustion would take both offline. A prior runaway (13 GB) was a cron re-settling terminal matches every 5 min — fixed.

## Liga-specific code (what to touch for the Liga)

- `data/liga-2026.json` — 30 teams in 2 zonas, keyed by ESPN id + disambiguated code + name.
- `lib/liga-2026.ts` — team meta, `getLigaZoneLabel` (match), `getLigaZoneLabelByName` (canonical zone by team name), tournament config.
- `lib/repositories/liga-fixtures.ts` — `ingestLigaFixtures({daysBack,daysAhead})`: pulls ESPN, creates matches + 1x2 markets + outcomes, sets result/status/winner for finished, backfills scheduled→finished, re-syncs reprogrammed kickoffs.
- `lib/espn-bracket.ts` — `/cruces` data: zone tables from ESPN standings + playoff rounds from scoreboard slugs (playoff `season.slug` values still TBD until playoffs start — ROUND_DEFS has guesses; `SCOREBOARD_URL` needs a playoff date range then).
- `lib/liga-preview.ts` + `app/preview/*` — DB-free preview pages (fixtures/bracket straight from ESPN, no auth), kept for viewing without a DB.
- `app/api/cron/sync-fixtures/route.ts` — daily fixture/result sync (Bearer `CRON_SECRET`). `vercel.json` schedules it `0 8 * * *`. Vercel **Hobby = 1 cron/day**; live in-match scores would need Pro + a windowed `sync-scores` cron.
- `scripts/seed-liga-2026.mjs` (`pnpm db:seed:liga`) — seeds 30 teams + stages + champion market. `scripts/liga-live-test.mjs` — read-only ESPN poller (`node scripts/liga-live-test.mjs [YYYYMMDD]`).
- `components/team-crest.tsx` — `TeamCrest` renders the escudo `<img>` (used everywhere teams show).

The pari-mutuel engine (`lib/settlement-engine.ts`, `lib/game.ts`), auth, tickets, reveal, leaderboard are tournament-agnostic and were reused unchanged.

## Theme (LPF)

Navy base + cyan accent, no alarm red. Tokens in `app/globals.css :root`: `--gold` = cyan `#3fe3f2` (brand/positive/CTA/win), `--live` = amber `#f4a63c` (live/attention), `--negative` = slate `#8b93ab` (loss), outcomes home=cyan / away=amber / draw=slate. Outcome color source is `lib/match-ui.ts` `getOutcomeColor` (must stay in sync with the tokens). Logo at `public/lpf.jpg` (nav wordmark + regenerated favicons). No "Mundial" strings remain.

## Config / operational

- `CHAMPION_PICK_LOCK_AT` in `lib/champion.ts` = `2026-08-31T02:59:59Z` (= 30/08 23:59 ART), widened from 18/08 on 2026-08-15 so late signups can still pick. `champion_market.lock_at` in the DB was PATCHed to match — **change both or the UI and the DB disagree.**
- `ADMIN_DISPLAY_NAMES` (Vercel env) gates `/api/admin/*`; default-deny in prod without it.
- Match/quick-play deck is ordered chronologically by kickoff (`components/quick-play-deck.tsx`).
- Initial fixture load: `GET /api/cron/sync-fixtures?daysBack=10&daysAhead=95` with `Authorization: Bearer <CRON_SECRET>` (loaded ~210 of the ~240 regular-phase matches; the rest appear as ESPN dates them).

## Saving a pick — the one invariant

**Never put a save behind `await animation.finished`.** In `motion@12.40.0` that promise only resolves from `finish()`; `cancel()` leaves it pending forever and there is no reject path (`motion-dom/.../utils/WithPromise.mjs`). That cost ~150 of Esteban's picks on 2026-08-08: the pick reached neither localStorage nor the API, `isChoosingRef` stayed `true`, and the deck died silently for the rest of the session while the card had already animated away. Use `settleAnimations()` from `lib/motion-settle.ts` (700ms ceiling, never hangs or rejects) and release any in-flight ref in a `finally`.

All pick writes go through `savePick()` in `lib/pick-save.ts` — deck and match detail both. It writes the local draft, POSTs, and marks `saved_remote` or `sync_error`. The interactive path makes one attempt (retries belong in the background); `retryUnconfirmedPicks()` does the backoff ladder, driven by `sync-retry.tsx` on an interval / focus / reconnect. **Do not drive that retry off `ALLOCATION_EVENT`** — a failed retry rewrites the draft, re-fires the event and loops.

Confirmation UI must reflect the server, not the tap: green check + "Guardado" only when confirmed, amber "Sin confirmar" otherwise, and `components/unconfirmed-picks-banner.tsx` (mounted in `app/layout.tsx`, **not** in the deck — `home-page-client.tsx` unmounts the deck at `pendingPicks === 0`) surfaces the count anywhere in the app.

## Known post-deploy fixes (already applied)

- Login loop: middleware bounced any cookie-present user off `/login` → a stale cookie trapped you. Removed the reverse redirect.
- Champion save race: trusted a stale client session right after register → saved locally not to DB. Now reads `/api/session` authoritatively first.
- Picks lost behind a cancelled animation (2026-08-15, commit `963e9ab`) — see the invariant above.

## Remaining / watch-items

- **`pick_events` is not in the Liga DB yet.** `supabase/migration-pick-events.sql` has to be pasted into the Supabase Studio SQL editor by hand: there is no `psql` / Supabase CLI here, and `.env.production.local` holds the OLD Mundial project's Postgres credentials (`fdquvrqwingrwdghenrm`), not the Liga's (`qohwzsmuihpfaoywsmjv`). Until it runs, `logPickEvent` fails on every save (console.error only) and nothing is recoverable.
- **Table reset to fecha 6** — `scripts/reset-table.mjs --confirm`, run Monday 2026-08-18. Dry-run by default, backs up to JSON, aborts if fecha 5 is not fully settled.

- Playoffs mapping when they start (ESPN slugs + scoreboard date range in `lib/espn-bracket.ts`).
- Live in-match scores need Vercel Pro (Hobby cron = daily). The Hobby account already hit "exceeded free resources" once.
- Deck UX: currently all pending matches chronological; options discussed (scope to next fecha / fecha separators) if users find 185-at-once heavy.
