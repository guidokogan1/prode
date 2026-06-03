# Future feature: Leagues (private group rankings)

**Status:** NOT implemented. Detailed UX plan documented for when/if needed.

## Decision history

Discussed 2026-06-03, decided NOT to implement before launch. Rationale:
- The product lifespan is the WC itself (~38 days)
- A single shared link with one group satisfies the launch use case
- Adding the feature pre-launch risks core-flow bugs in critical kickoff window
- If users start asking for it after WC starts, we can ship in 4-5 hours of focused work

If the feature does need to ship, follow this plan.

## Mental model for users

> "I play 72 matches once. Each league is a mini-leaderboard with people I care about."

Three principles the UI must communicate:
1. Picks are global to the user — they don't change per league
2. A league is a filter of "who's on the leaderboard"
3. Leagues are ADDITIVE to the global ranking, not replacing it

## Data model (3 new tables, 0 changes to existing)

```sql
create table leagues (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  owner_id      uuid not null references users(id) on delete cascade,
  invite_code   text not null unique,
  is_open       boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table league_members (
  league_id    uuid references leagues(id) on delete cascade,
  user_id      uuid references users(id) on delete cascade,
  role         text default 'member',  -- 'owner' | 'admin' | 'member'
  joined_at    timestamptz default now(),
  primary key (league_id, user_id)
);

alter table leaderboard_snapshots add column league_id uuid references leagues(id) on delete cascade;
-- null league_id = global ranking. non-null = league-scoped.

create index leagues_owner_idx on leagues(owner_id);
create index league_members_user_idx on league_members(user_id);
create index league_members_league_idx on league_members(league_id);
create index leaderboard_snapshots_league_idx on leaderboard_snapshots(league_id);
```

**Why no changes to `tickets`, `champion_picks`, `pick_events`:** picks remain user-scoped. The league is purely a "who appears on the leaderboard" filter.

## MVP scope (4-5 hours)

Cut everything non-essential. Only ship:
1. Create league (just name)
2. Join via invite link
3. Selector in `/ranking` to switch between Global + my leagues
4. Filtered ranking per league
5. Leave league

SKIP for MVP:
- Owner transfer, kicking members, regenerating codes, closing inscriptions
- Empty state polish, animations
- Detail page for each league

Add them iteratively if needed.

## API endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/leagues` | `{ name }` | `{ id, invite_code }` |
| POST | `/api/leagues/join` | `{ inviteCode }` | `{ ok, leagueId }` |
| GET | `/api/leagues` | — | `[{ id, name, member_count }]` for current user |
| POST | `/api/leagues/[id]/leave` | — | `{ ok }` |

Future endpoints (post-MVP):
- `PATCH /api/leagues/[id]` — rename, open/close, regenerate code
- `DELETE /api/leagues/[id]/members/[userId]` — kick
- `POST /api/leagues/[id]/transfer-owner` — pass ownership
- `DELETE /api/leagues/[id]` — delete league

## Routes (Next App Router)

| Path | Purpose |
|---|---|
| `/leagues` | Index: list of my leagues + create + join with code |
| `/leagues/new` | Create form |
| `/leagues/[id]` | League detail (members + invite link) |
| `/leagues/join/[code]` | Public join landing (auto-redirects to login if not authed) |
| `/ranking?league=<id>` | Existing route with new optional query param |

## Critical UX details

### Selector in `/ranking`

Horizontal pill row at top, scrollable:
```
[● Global · 47]  [Familia · 5]  [Sofi · 2]  [+ Crear/Unirme]
```

Switch with `router.replace('?league=<id>')`. Body of ranking animates with `opacity 1→0→1` only (no slide — visual jitter).

### Join flow

Owner shares: `https://prode-indol.vercel.app/leagues/join/FAM-X4K9`

Recipient flow:
1. Open link
2. Middleware checks session → redirects to `/login?next=/leagues/join/FAM-X4K9` if not logged in
3. After login (or if already logged in), shows: "Te invitan a Familia Kogan / 5 jugadores" + [Unirme] [No, gracias]
4. Unirme → POST to `/api/leagues/join` → redirect to `/leagues/[id]`

### Invite code format

8 chars alphanumeric, avoid confusing chars (0, O, 1, l). Examples: `FAM-X4K9`, `SOFI-J2T8`. The `<3-letter-prefix>-<5-char-suffix>` format is human-friendly. Random suffix collision → retry on insert.

### Champion is GLOBAL

A user's champion pick is THE same across all leagues. Don't add per-league champion picks. Keeps the data model and UX simple.

## Edge cases enumerated

| Case | Behavior |
|---|---|
| Owner deletes account | `leagues.owner_id` cascade → league deletes. Other members lose visibility. Picks stay. |
| User joins league after WC starts | OK if `is_open`. Their existing picks count for past matches retroactively. |
| User leaves and re-joins | Both fine. Their picks unchanged, just visibility toggles. |
| Two users join with same code simultaneously | Independent inserts, no race. Both succeed. |
| User pastes link vs raw code | Frontend extracts code via regex from both. |
| Invite code leaked publicly | Owner regenerates code (post-MVP). Pre-MVP: delete league + recreate. |
| Liga with 1 member (just owner) | Permitted. Ranking shows 1. No podium. |
| User with 0 leagues | `/ranking` defaults to Global. No errors. |
| Owner tries to leave (post-MVP) | Force transfer first via UI. |
| 50+ members in a league | Cap at 50 for MVP. Add pagination later. |

## Effort breakdown

| Block | Hours |
|---|---|
| DB migrations (3 tables + index + leaderboard_snapshots.league_id) | 0.5 |
| API: create / join / leave / list | 1.0 |
| `/leagues` + `/leagues/new` UI | 1.0 |
| `/leagues/[id]` detail UI | 0.5 |
| `/leagues/join/[code]` landing | 0.5 |
| `/ranking` selector + filtered ranking | 1.5 |
| Modify recomputeLeaderboardSnapshots for per-league | 0.5 |
| Testing | 0.5 |
| **Total** | **~5 hours** |

## Implementation order

1. DB migrations + indexes
2. API endpoints (untested via curl/Chrome MCP first)
3. `/leagues` index + create
4. `/leagues/join/[code]` landing
5. Ranking selector + filter
6. recomputeLeaderboardSnapshots multi-league support
7. End-to-end test in Chrome MCP

## Don't do this

- Don't make picks per-league (data model explosion, UX confusion)
- Don't auto-join people to a "default" league (Global is the default)
- Don't add chat/messaging (use WhatsApp, scope)
- Don't add tournament brackets between leagues (mega scope)
- Don't add push notifications (requires infra + permissions)
