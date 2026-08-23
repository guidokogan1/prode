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
- **Gotcha:** `matches.id` is **text**, not uuid — it is the ESPN id with a prefix (`cl-401841448`). Every FK pointing at `matches(id)` must be declared `text` or Postgres rejects it with `42804 ... incompatible types: uuid and text`. Everything else (users, tickets, markets, outcomes) is uuid, so it is easy to assume wrong. Read `supabase/schema.sql` before writing a migration.

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

- `CHAMPION_PICK_LOCK_AT` in `lib/champion.ts` = `2026-09-10T02:59:59Z` (= 09/09 23:59 ART), widened from 18/08 on 2026-08-15 and again from 30/08 on 2026-08-23 so late signups can still pick. `champion_market.lock_at` in the DB is PATCHed to match — **change both or the UI and the DB disagree.** Note the API only gates on the constant (`app/api/champion/route.ts` reads `id, status` and never `lock_at`), so the DB column is the one that drifts silently.
- `ADMIN_DISPLAY_NAMES` (Vercel env) gates `/api/admin/*`; default-deny in prod without it.
- Match/quick-play deck is ordered chronologically by kickoff (`components/quick-play-deck.tsx`).
- Initial fixture load: `GET /api/cron/sync-fixtures?daysBack=10&daysAhead=95` with `Authorization: Bearer <CRON_SECRET>` (loaded ~210 of the ~240 regular-phase matches; the rest appear as ESPN dates them).

## Saving a pick — the one invariant

**Never put a save behind `await animation.finished`.** In `motion@12.40.0` that promise only resolves from `finish()`; `cancel()` leaves it pending forever and there is no reject path (`motion-dom/.../utils/WithPromise.mjs`). That cost ~150 of Esteban's picks on 2026-08-08: the pick reached neither localStorage nor the API, `isChoosingRef` stayed `true`, and the deck died silently for the rest of the session while the card had already animated away. Use `settleAnimations()` from `lib/motion-settle.ts` (700ms ceiling, never hangs or rejects) and release any in-flight ref in a `finally`.

All pick writes go through `savePick()` in `lib/pick-save.ts` — deck and match detail both. It writes the local draft, POSTs, and marks `saved_remote` or `sync_error`. The interactive path makes one attempt (retries belong in the background); `retryUnconfirmedPicks()` does the backoff ladder, driven by `sync-retry.tsx` on an interval / focus / reconnect. **Do not drive that retry off `ALLOCATION_EVENT`** — a failed retry rewrites the draft, re-fires the event and loops.

Confirmation UI must reflect the server, not the tap: green check + "Guardado" only when confirmed, amber "Sin confirmar" otherwise, and `components/unconfirmed-picks-banner.tsx` (mounted in `app/layout.tsx`, **not** in the deck — `home-page-client.tsx` unmounts the deck at `pendingPicks === 0`) surfaces the count anywhere in the app.

## Closing a market — the second invariant

**The pick window is a time comparison, never a stored column.** `isPickWindowOpen()` in `lib/market-lifecycle.ts` is the single rule: the market must be `open`, the match must still be `scheduled`, and `lock_at` (which the fixture ingest sets to the kickoff) must be in the future. Both `submitTicket` and the view model's `isEditable` go through it, so a card locks itself at kickoff **with no cron involved**.

Before 2026-08-18 both gated on `match_markets.status`, which only a once-a-day cron advanced, so for up to 24h after kickoff you could still change a pick on a match you had already watched on TV. `submitTicket` was even selecting `lock_at` and never reading it.

## Cron cadence and the egress budget

Vercel **Hobby allows one cron per day**, and that slot belongs to `sync-fixtures` (fixture ingest + full lifecycle). Anything more frequent has to come from outside.

`/api/cron/tick` is the endpoint built for a frequent external scheduler (cron-job.org). It is designed so that **doing nothing costs nothing**:
- One indexed query on `match_markets` joined to `matches`, filtered `status != settled` and kickoff within `[now - 5h, now + 10min]`. Empty → returns `{idle:true}` with no ESPN call, no write, no leaderboard recompute.
- A settled market drops out of the window permanently, so terminal matches are never read again.
- `syncMatchMarket` is a no-op when the derived status and outcome are unchanged (it used to UPDATE unconditionally, over all 210 matches, every run — that is the read pattern that burned 13GB against the 5GB tier in July; `ef1061a` fixed re-settling, not this).
- `TICK_DISABLED=1` in the Vercel env kills it without a deploy.
- Any match that errors makes the whole response a 500, so the scheduler's failure alert fires.

`lib/repositories/live-scores.ts` holds the ESPN score sync, shared by the tick and the `sync-scores` route, so a single ping does scores + lifecycle.

## Scoring — points only for a literal hit

**Errar nunca paga.** A ticket whose pick is not the winning outcome gets `gross 0 / net -credit`, and that includes the case where **nobody** picked the winner: the pool is not refunded, it simply is not paid out. Before 2026-08-22 `computeMarketSettlements` refunded the full credit to everyone when `winningPool <= 0`, which meant a draw pick on a 2-3 match came out even — the exact thing the players complained about ("puse empate, no fue empate, y no perdí nada"). The table is gross-based and never goes down, so "nobody cobra" moves nobody, which is the intended reading of the rules sheet: *"Ese pozo se reparte solo entre los que le pegaron al resultado."*

`settleTicket` still throws on `winningPool <= 0` on purpose: it is only reachable through the winners path, and `computeMarketSettlements` returns before calling it. Do not "fix" that throw.

**The table sorts by gross (total cobrado), not by net.** That is by design and matches the rules sheet ("Total — la plata que cobraste... Nunca baja"). `getRanking` and `recomputeLeaderboardSnapshots` must sort by the same key or the position and the number shown disagree. A genuine tie (same gross + same aciertos + same best single hit) gets a **shared position** via `assignSharedPositions` — the rules sheet promises "empate compartido", and an alphabetical fallback was silently putting Mariano above oso on identical numbers.

**Aciertos has one definition: you got something back.** Since the soft/medium/hard split was removed (2026-07-28) every ticket is all-in, so a ticket either takes its share of the pool or takes zero — `gross > 0` is exactly "your pick won". `loadGrossAggregates.hitsCount` checks the pick against the winning code (what the UI shows) and the snapshot passes `isHit: gross_return_amount > 0` into `computeLeaderboard`; the two agree. Before that, the snapshot counted `net > 0`, which **undercounts the case where everyone hits**: Newell's 2-1 Banfield on 2026-08-23 had all four players on `home`, so every net was exactly 0 and the snapshot recorded zero aciertos for a match nobody got wrong.

`computeLeaderboard` still falls back to `net > 0` when `isHit` is absent, and that fallback is what the tie-break test exercises: in a **partial-allocation** world `gross > 0` would also mean "cobré algo aunque le erré con la principal", which is explicitly not an acierto. Do not hardcode `gross > 0` inside the engine — pass the flag from the caller that knows the market is all-in.

## A match that never kicked off has no score

ESPN returns `score: "0"` for a `pre` fixture, so the ingest used to store `0-0` on every unplayed match. That is a loaded gun: `deriveWinningOutcomeCode` reads the scores as soon as the status is `finished`, so any path that flips a match terminal before real scores land derives **`draw`** out of nothing — and draw pickers get paid for a match nobody played. `ingestLigaFixtures` now writes scores only when `state !== "pre"`, and `scripts/repair-no-winner-and-phantom-scores.mjs` cleared the 128 rows that already had the phantom 0-0.

**The winning outcome is re-derived, not remembered.** `syncMatchMarket` used `market.winning_outcome_code ?? derive(...)`, so a wrong code — once written — was permanent even after the real score arrived. It now prefers the derived value while the market is **not** settled, and leaves a settled market untouched (changing it there would desync the settlements). A settled market whose stored code disagrees with the score is reported as `settledOutcomeMismatch` instead of being silently rewritten; that case needs a re-settle, not a patch.

**The fixture backfill can advance a live match.** The condition was `existing.status === "scheduled"`, so a match the daily cron caught mid-game stayed `live` with a frozen score forever — `ingestLigaFixtures` would never touch it again, and once it fell out of `syncLiveScores`'s 6h window nothing else would either. That is a market stuck at `revealed` with tickets that never reach the table. Now anything not `finished` can be advanced.

## Who owns the "settled" transition

**`settleMatchMarket` is the only thing that may persist `settled`.** The sync step goes to `revealed` at most, via `persistableMarketStatus()` in `lib/market-lifecycle.ts`. Two invariants live in that one function:

- **A failed settle must stay retryable.** Every caller guards on `previousStatus !== "settled"`, so if the sync step marked the market terminal first, a transient settle failure would strand a played match with tickets that silently never reaches the table. Leaving it at `revealed` means the next tick retries and it self-heals. (Fixed 2026-08-18, `f576abb`.)
- **An already-settled market is never downgraded.** Returning `revealed` for it would let the next run settle it again and resurrect the settlements the fecha-6 reset deleted. `persistableMarketStatus("settled", "settled")` returns `settled`.

**A market with no tickets is settled, not an error.** `settleMatchMarket` closes it and returns ok. Without that, the rule above would park every unplayed match at `revealed` forever, retrying each run and firing the scheduler's failure alert.

Before changing anything here, run `node --env-file=.env.local scripts/diag-lifecycle-sim.mjs`: it replays the derive/persist decision over all 210 markets read-only and must report **210 no-ops and 0 downgrades** on a quiet day. `scripts/diag-playability.mjs` is the companion check that no open match became unplayable.

## Known post-deploy fixes (already applied)

- Login loop: middleware bounced any cookie-present user off `/login` → a stale cookie trapped you. Removed the reverse redirect.
- Champion save race: trusted a stale client session right after register → saved locally not to DB. Now reads `/api/session` authoritatively first.
- Picks lost behind a cancelled animation (2026-08-15, commit `963e9ab`) — see the invariant above.
- Picks editable after a match finished, and results a day late (2026-08-18, commit `3b84234`) — see the two sections above.
- A failed settlement stranding a market as terminal (2026-08-18, commit `f576abb`) — see the ownership section above.

## Remaining / watch-items

- **`pick_events` is not in the Liga DB yet.** `supabase/migration-pick-events.sql` has to be pasted into the Supabase Studio SQL editor by hand: there is no `psql` / Supabase CLI here, and `.env.production.local` holds the OLD Mundial project's Postgres credentials (`fdquvrqwingrwdghenrm`), not the Liga's (`qohwzsmuihpfaoywsmjv`). Until it runs, `logPickEvent` fails on every save (console.error only) and nothing is recoverable.
- **Table reset to fecha 6** — `scripts/reset-table.mjs --confirm`, run Monday 2026-08-18. Dry-run by default, backs up to JSON, aborts if fecha 5 is not fully settled.

- Playoffs mapping when they start (ESPN slugs + scoreboard date range in `lib/espn-bracket.ts`).
- Live in-match scores need Vercel Pro (Hobby cron = daily). The Hobby account already hit "exceeded free resources" once.
- Deck UX: currently all pending matches chronological; options discussed (scope to next fecha / fecha separators) if users find 185-at-once heavy.
