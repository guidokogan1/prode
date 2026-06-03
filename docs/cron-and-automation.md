# Cron jobs and automation

GitHub Actions runs all crons (NOT Vercel cron — Hobby tier only allows 1/day, GHA gives unlimited 5-min crons free).

## Crons running today

| Name | Schedule (UTC) | Endpoint | Purpose |
|---|---|---|---|
| `cron-process-matches.yml` | `*/5 * * * *` | `/api/cron/process-all` | Advance match lifecycle (open → locked → live → settled), recompute leaderboard |
| `cron-sync-scores.yml` | `*/15 * * * *` | `/api/cron/sync-scores` | Pull scores + status + kickoff times from football-data.org, also auto-insert knockout matches once teams resolve |
| `cron-backup-picks.yml` | `0 4 * * *` (= 01:00 ART) | `/api/cron/backup-picks` | Dump `pick_events` to Supabase Storage bucket `pick-backups` |
| `cron-settle-champion.yml` | `10 */6 * * *` | `/api/cron/settle-champion` | Idempotent: settle champion market when WC final is scored |

## How auth works

Every cron endpoint requires `Authorization: Bearer <CRON_SECRET>`. The GHA workflows pass `${{ secrets.CRON_SECRET }}` from repo secrets. The endpoint validates against `process.env.CRON_SECRET` from Vercel env.

If you rotate `CRON_SECRET`, update it in BOTH places (Vercel env vars + GitHub Actions repo secrets).

## football-data.org API

| Setting | Value |
|---|---|
| Token | env var `FOOTBALL_DATA_TOKEN` (set in Vercel) |
| Header | `X-Auth-Token` |
| Free tier | 10 req/min, 100 req/day |
| Competition code | `WC` (id 2000) |
| Endpoints used | `/v4/competitions/WC/matches`, `/v4/competitions/WC/teams` |

### TLA → fifa_code mapping

football-data uses slightly different 3-letter codes for 3 countries:

```ts
const FD_TO_DB = {
  RSA: "ZAF",  // South Africa
  HAI: "HTI",  // Haiti
  URY: "URU",  // Uruguay
};
```

### Stage code mapping (FD → our `tournament_stages.code`)

```ts
const FD_STAGE_TO_DB = {
  GROUP_STAGE: "group",
  LAST_32: "round_of_32",
  LAST_16: "round_of_16",
  QUARTER_FINALS: "quarter_final",
  SEMI_FINALS: "semi_final",
  THIRD_PLACE: "third_place",
  FINAL: "final",
};
```

### Status mapping (FD → match.status)

| FD | Our DB |
|---|---|
| `TIMED` / `SCHEDULED` | `scheduled` (unchanged — `mapStatus` returns null) |
| `IN_PLAY` / `PAUSED` / `EXTRA_TIME` / `PENALTY_SHOOTOUT` / `LIVE` | `live` |
| `FINISHED` / `AWARDED` | `finished` |
| `POSTPONED` | `postponed` |
| `SUSPENDED` / `CANCELLED` | `cancelled` |

**Critical:** the lifecycle in `lib/market-lifecycle.ts` expects `"finished"` not `"final"`. If sync writes `"final"`, the market never transitions to `settled` and picks never get scored. This was a bug fixed in commit `9bf8f35`.

## Knockout auto-insert (sync-scores)

Football-data's bracket fills in teams progressively as group stage settles. The sync detects matches where:
- Stage is one of `LAST_32/LAST_16/QUARTER_FINALS/SEMI_FINALS/THIRD_PLACE/FINAL`
- Both `homeTeam.tla` and `awayTeam.tla` are non-null (teams resolved)
- Our DB has no match with this (home_id, away_id) pair

For each such match, the cron inserts:
1. A row in `matches` (with FD's `id` as `external_id`)
2. A row in `match_markets` with `market_type: "qualifies"` and `status: "open"`
3. Two rows in `market_outcomes`: `home_qualifies` ("Clasifica local") and `away_qualifies` ("Clasifica visitante")

This means knockout matches don't need to be pre-seeded. They show up automatically when the brackets fill.

## process-all-matches lifecycle

The 5-minute cron iterates all matches and runs `processMatchLifecycle(matchId)`:

```
1. syncMatchMarket(matchId)
   - Reads current match.status and market.lock_at
   - Derives next market status via deriveMarketStatus(...)
   - Transitions: open → locked → revealed → settled
2. If transitioned to "settled" with winningOutcome:
   - settleMatchMarket(matchId) → marks tickets with net_result_amount
3. If transitioned to "revealed":
   - recomputeLeaderboardSnapshots() → updates rankings
```

**Lock-by-timestamp safety net:** even if football-data is down, `deriveMarketStatus` transitions `open → locked` when `now() >= lock_at`. Picks can't be edited past kickoff regardless of external API health.

## settle-champion cron

Runs every 6 hours. Idempotent. Logic:
1. Find first/only champion_market row
2. If already settled → return
3. Find the FINAL stage match (highest `sort_order` in `tournament_stages`)
4. If that match has status `finished` and winner_team_id is set:
   - Update champion_market.winning_team_id + status='settled' + settled_at
   - For each champion_pick row: set gross_return_amount + net_result_amount + settled_at based on `pick.team_id === winner_team_id`
5. Return summary

## Manual cron trigger (debugging)

```bash
gh workflow run cron-process-matches.yml -R guidokogan1/prode
gh workflow run cron-sync-scores.yml -R guidokogan1/prode
gh workflow run cron-backup-picks.yml -R guidokogan1/prode
gh workflow run cron-settle-champion.yml -R guidokogan1/prode

# Watch results:
gh run list -R guidokogan1/prode --workflow=cron-sync-scores.yml --limit 3
```

Direct curl (you need the CRON_SECRET):
```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://prode-indol.vercel.app/api/cron/sync-scores"
```

## Daily checklist during the WC

Once per day, hit `/api/admin/health` with your Guido session and verify:
- `tickets > 0` and growing
- `pickEvents > 0` and growing
- `matchesSettled` matches your expectation given today's date
- `lastPickEvent.created_at` is recent if there's been activity

If anything's off, check workflow logs via `gh run list`.
