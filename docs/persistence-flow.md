# Persistence flow — read before touching `submitTicket`

This is the most critical and most-broken part of the app. If you change it, follow the order strictly or you re-introduce the ghost-ticket bug.

## The contract

**Frontend → POST `/api/tickets`** with body:
```json
{
  "matchId": "a-mex-zaf",
  "allocations": [
    { "code": "home", "label": "Gana local", "amount": 7000 },
    { "code": "draw", "label": "Empate", "amount": 2000 },
    { "code": "away", "label": "Gana visitante", "amount": 1000 }
  ]
}
```

- `code` is preferred — backend matches it first
- `label` is fallback for older drafts that don't have `code`
- `amount` must sum to exactly **10000** across all allocations (`MATCH_CREDIT`)

## Backend flow (must stay in this order)

In `lib/product/supabase-provider.ts` `submitTicket()`:

```
1. validateAllocations(payload.allocations)
   → must sum to 10000 (lib/game.ts)
   → if not, return early with reason; nothing in DB touched

2. Resolve session.userId from cookie
   → if missing, return early

3. Query match_market by matchId (embedding match → home/away team names)
   → if missing or status !== "open", return early

4. Query market_outcomes for this market
   → must return 2-3 rows (1x2 or qualifies)

5. Match each payload allocation to an outcome (THIS IS THE CRITICAL STEP):
   const matched = payload.allocations.map(a => {
     return outcomes.find(o =>
       (a.code && o.code === a.code) ||                          // primary: by code
       normalize(o.label) === normalize(a.label) ||              // fallback: by label
       normalize(getOutcomeDisplayLabel(o.code, home, away, market_type)) === normalize(a.label)  // dynamic
     );
   });

6. GUARDS — these prevent the ghost-ticket bug:
   - if (matched.length !== payload.allocations.length) → 400
   - if (matched.length === 0) → 400
   - if (sum of matched.amount <= 0) → 400

7. Upsert ticket (user_id + match_market_id unique)
8. Delete existing ticket_allocations for this ticket
9. Insert new allocations
10. logPickEvent({kind: "match_pick", ...}) → fires audit log
11. Return ok:true
```

## Why each guard exists

| Guard | What happens without it |
|---|---|
| `validateAllocations` sum === 10000 | User saves partial allocations, score math breaks |
| `matched.length !== payload.length` | Labels don't match outcomes → silent mismatch, wrong outcome wins |
| `matched.length === 0` | Empty array passes the previous check (0 === 0). Ticket gets created with NO allocations. **Ghost ticket bug.** |
| `totalAllocated <= 0` | Belt-and-suspenders against allocations with all 0 amounts |

## What `validateAllocations` actually checks

```ts
// lib/game.ts
export function validateAllocations(allocations: AllocationInput[]) {
  const total = allocations.reduce((sum, a) => sum + (a.amount || 0), 0);
  if (total !== MATCH_CREDIT) return { ok: false, reason: `La jugada debe sumar ${MATCH_CREDIT}.` };
  return { ok: true };
}
```

So passing `[]` fails because `0 !== 10000`. Good. Passing `[{amount: 0}, {amount: 0}, {amount: 0}]` also fails. Good.

## The 3 client save sites

All three must send `code + label`. If you add a fourth save flow, follow the same contract.

1. `components/quick-play-deck.tsx` — `handleIntensityPick`
2. `components/match-vote-card.tsx` — `handleIntensityPick`
3. `components/match-detail-card.tsx` — `handleIntensityPick`

Payload construction is identical in all three:
```ts
const payload = buildPresetAllocation(match.allocation.map(a => a.code), chosenOutcome, intensity)
  .map(item => ({
    code: item.outcomeCode,
    label: match.allocation.find(a => a.code === item.outcomeCode)?.label ?? item.outcomeCode,
    amount: item.amount,
  }));
```

## SyncRetry — fire-and-forget background safety net

`components/sync-retry.tsx` runs once per app session (mounted in `app/layout.tsx`). On mount:

1. Check `session.kind === "remote"`. Otherwise skip.
2. Pull only drafts marked `status: "sync_error"` from localStorage (NOT `saved_remote`).
3. For each, POST to `/api/tickets`.
4. On success, update localStorage to `saved_remote`.

**DO NOT change it to retry `saved_remote` drafts.** That causes cross-device overwrites. If you need to recover lost tickets, use `/api/admin/recover-from-events` instead.

## Optimistic UI vs server-truth

In `quick-play-deck.tsx`:
- `justSavedIds` Set in component state holds match IDs the user just picked
- The deck filter excludes matches in `justSavedIds` immediately (don't wait for server roundtrip)
- `savedMatchSnapshot` captures the match data at pick time so the "Guardado" view renders correctly even after the deck array shifts

This prevents the flash-of-saved-match bug.

## Audit log vs primary data

| Use case | Table |
|---|---|
| Source of truth for ranking | `tickets` + `ticket_allocations` |
| What the user picked, immutable | `pick_events` |
| Recovery if `tickets` is corrupted | `pick_events` (via `/api/admin/recover-from-events`) |
| Daily JSON backup to Supabase Storage | `pick_events` (via cron `/api/cron/backup-picks`) |

`pick_events` is append-only. Never truncate it.
