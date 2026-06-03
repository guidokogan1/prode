# Runbook — operational guide during the WC

## Daily checks (5 min/day during WC)

```bash
# Get your session cookie
COOKIE=$(grep mundial_pool_session ~/.config/google-chrome/<profile>/Cookies 2>/dev/null || echo "")
# Or just open prode-indol.vercel.app, devtools → Application → Cookies → copy mundial_pool_session value
```

### 1. Health check

```bash
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/health" | jq
```

Expected during WC:
- `tickets` grows over time as people play
- `matchesSettled` grows by 4-12 per day during group stage
- `pickEvents.created_at` is recent (within last 24h if there's activity)

### 2. Ticket integrity check

```bash
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/diag-tickets" | jq '.byUser'
```

For each user, `ticketsWithZeroAllocations` MUST be `0`. If non-zero → ghost-ticket bug returned → see below.

### 3. Cron status

```bash
gh run list -R guidokogan1/prode --workflow=cron-process-matches.yml --limit 5
gh run list -R guidokogan1/prode --workflow=cron-sync-scores.yml --limit 5
gh run list -R guidokogan1/prode --workflow=cron-backup-picks.yml --limit 5
```

All recent runs should be `success`. If any fail, click into them and check logs.

## Incident response

### Symptom: ghost tickets coming back

```bash
# 1. Backup first
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/export-picks" > /tmp/backup-$(date +%s).json

# 2. Confirm the diagnosis
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/diag-tickets" | jq '.byUser'

# 3. Clean
curl -X POST -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/clean-empty-tickets"

# 4. Investigate root cause: look at recent git commits to /api/tickets endpoint
git log --oneline -- lib/product/supabase-provider.ts | head -10
```

If clean-empty-tickets needs to be re-run, something is creating empty tickets. Check the `submitTicket` guards in `lib/product/supabase-provider.ts`.

### Symptom: user reports "mi pick desapareció"

```bash
# 1. Check if their ticket exists
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/diag-tickets" | jq '.byUser["<displayName>"]'

# 2. Check the audit log
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/export-picks" | jq '.events[] | select(.user_display_name == "<displayName>")'

# 3. If audit log has the pick but ticket doesn't → run recovery
curl -X POST -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/recover-from-events"
```

### Symptom: a match shows as still "open" 5+ min after kickoff

The lock-by-timestamp should have transitioned it to `locked`. Causes:
1. `cron-process-matches.yml` workflow failed → check `gh run list`
2. `match_markets.lock_at` is wrong in DB
3. The `processAllMatchLifecycles` function errored

Manual force-process:
```bash
curl -X POST -b "mundial_pool_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"matchId":"a-mex-zaf"}' \
  "https://prode-indol.vercel.app/api/admin/process-match"
```

### Symptom: scores aren't syncing during a live match

Check that:
1. `FOOTBALL_DATA_TOKEN` env is still valid in Vercel
2. football-data.org isn't down: `curl -H "X-Auth-Token: $TOKEN" https://api.football-data.org/v4/competitions/WC/matches?status=IN_PLAY`
3. `cron-sync-scores.yml` is running every 15 min

Manual force-sync:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://prode-indol.vercel.app/api/cron/sync-scores"
```

### Symptom: ranking doesn't update after a match settles

The `processMatchLifecycle` should auto-trigger `recomputeLeaderboardSnapshots` on settle. If it didn't:

```bash
curl -X POST -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/recompute-ranking"
```

### Symptom: champion didn't auto-settle after final

Check `cron-settle-champion.yml` ran (every 6 hours). Force it:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://prode-indol.vercel.app/api/cron/settle-champion" | jq
```

If the WC final match is `finished` with `winner_team_id`, settlement should run.

## Backups

Daily JSON dumps of `pick_events` go to Supabase Storage bucket `pick-backups` at 04:00 UTC (01:00 ART).

To list:
```sql
-- via Supabase SQL editor
select name, metadata->>'size' as size, created_at
from storage.objects
where bucket_id = 'pick-backups'
order by created_at desc
limit 10;
```

To download: Supabase Studio → Storage → pick-backups → click any file.

Manual backup right now:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://prode-indol.vercel.app/api/cron/backup-picks"
```

## Disaster recovery procedure

If the entire `tickets` + `ticket_allocations` get nuked:

```bash
# 1. Verify pick_events is still intact
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/health" | jq '.counts.pickEvents'
# Should be > 0

# 2. Run recovery
curl -X POST -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/recover-from-events"

# 3. Verify
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/diag-tickets" | jq '.total'
```

If pick_events is ALSO gone (catastrophic):
1. Pull most recent JSON from `pick-backups` bucket
2. Manually insert via Supabase SQL editor
3. Run recovery

## Adding a new player mid-WC

Just share the prode link. Workflow:
1. They open `prode-indol.vercel.app` → redirected to `/login`
2. Tap "Crear cuenta" → register with name + 4-digit PIN
3. They see the home with "72 por jugar"
4. They tap-and-play 72 matches (~5-10 min total)
5. Pick champion via `/champion`
6. Done — they appear in `/ranking` from that moment

Their picks for matches that already finished are still allowed (we don't gate registration date). They just won't have earned points from those past matches. If you want strictness, lock new pick attempts on settled matches — but for friend games keep it open.

## Stopping a runaway cron

If a cron is running wild (e.g., generating errors or burning football-data quota):

```bash
# Disable the workflow
gh workflow disable cron-sync-scores.yml -R guidokogan1/prode

# Re-enable later
gh workflow enable cron-sync-scores.yml -R guidokogan1/prode
```

## Updating PIN / display name

There's NO endpoint for changing display name. PIN can be changed via `/pin` route in the app (existing flow).

If you need to fix a user's display name, run SQL via Supabase Studio:
```sql
update users set display_name = 'NewName' where display_name = 'OldName';
```
Note: `pick_events.user_display_name` is denormalized — old entries will keep the old name. That's intentional for audit integrity.
