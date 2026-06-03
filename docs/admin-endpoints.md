# Admin endpoints reference

All admin endpoints are gated by `isAdminRequestAuthorized` in `lib/admin-route.ts`. Auth modes:
- `x-admin-key` header matching `ADMIN_API_KEY` env (preferred for scripts)
- Logged-in session with `displayName` in `ADMIN_DISPLAY_NAMES` env (preferred for browser — set to `"Guido"`)
- In dev (`NODE_ENV !== "production"`): all requests allowed

## GET `/api/admin/health`

Returns counts + last pick event. Use for daily monitoring.

```bash
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/health"
```

Response:
```json
{
  "ok": true,
  "now": "2026-06-03T16:00:00.000Z",
  "counts": {
    "users": 3,
    "tickets": 72,
    "championPicks": 2,
    "pickEvents": 87,
    "matchesOpen": 72,
    "matchesSettled": 0
  },
  "lastPickEvent": {
    "created_at": "...",
    "kind": "match_pick",
    "user_display_name": "Guido"
  }
}
```

## GET `/api/admin/diag-tickets`

Per-user breakdown of tickets. The diagnostic that surfaces ghost tickets if they come back.

Response shape:
```json
{
  "ok": true,
  "total": 72,
  "byUser": {
    "Guido": {
      "ticketCount": 72,
      "ticketsWithZeroAllocations": 0,
      "totalAllocationsAmount": 720000
    }
  },
  "recent": [
    {
      "user": "Guido",
      "matchMarketId": "...",
      "submittedAt": "...",
      "allocationCount": 3,
      "allocationSum": 10000
    }
  ]
}
```

**Healthy invariants:**
- `ticketsWithZeroAllocations === 0` for everyone
- `totalAllocationsAmount === ticketCount * 10000`
- `allocationCount === 3` (group stage 1x2) or `2` (knockout qualifies) for every recent ticket
- `allocationSum === 10000` for every recent ticket

If any of these is off → run `/api/admin/clean-empty-tickets` then check root cause.

## GET `/api/admin/export-picks`

Returns full `pick_events` JSON. Use to back up before any destructive operation.

```bash
curl -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/export-picks" > backup.json
```

## POST `/api/admin/clean-empty-tickets`

Deletes any ticket with 0 allocations or 0 sum. Cascade also deletes orphan rows.

```bash
curl -X POST -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/clean-empty-tickets"
```

Returns `{ ok: true, deleted: N }`.

## POST `/api/admin/recover-from-events`

Rebuilds `tickets` + `ticket_allocations` from `pick_events` log. Idempotent.

```bash
curl -X POST -b "mundial_pool_session=$COOKIE" "https://prode-indol.vercel.app/api/admin/recover-from-events"
```

Returns per-user `{ recovered, skipped, errors }`. Use when:
- The `tickets` table got corrupted somehow
- Someone accidentally ran a destructive SQL
- After a Supabase migration that lost data

## POST `/api/admin/delete-user`

Cascade-deletes a user by display name. Use for cleaning test accounts.

```bash
curl -X POST -b "mundial_pool_session=$COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"TestFriend71981"}' \
  "https://prode-indol.vercel.app/api/admin/delete-user"
```

Cascade rules in schema delete: tickets, ticket_allocations, user_sessions, user_credentials, champion_picks, leaderboard_snapshots.

`pick_events` is NOT deleted (uses denormalized `user_display_name`, no FK). That's intentional — preserves the audit log even after user deletion.

## Other existing admin endpoints (legacy, untested today)

- `/api/admin/process-match` — process single match
- `/api/admin/process-all-matches` — same as cron but admin-gated
- `/api/admin/settle-match` — force settle a single match
- `/api/admin/sync-market` — sync single market
- `/api/admin/recompute-ranking` — rebuild leaderboard snapshots

## How to get your Guido session cookie

In Chrome with prode-indol.vercel.app open and logged in:
```js
document.cookie  // mundial_pool_session=<token>
```

Then use `-b "mundial_pool_session=<token>"` with curl. Cookie expires after 45 days unless rotated.

## Adding a new admin endpoint — template

```ts
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequestAuthorized } from "@/lib/admin-route";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAdminRequestAuthorized(request))) {
    return NextResponse.json({ ok: false, reason: "No autorizado." }, { status: 401 });
  }
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, reason: "Supabase no configurado." }, { status: 500 });
  }
  // your logic
  return NextResponse.json({ ok: true });
}
```
