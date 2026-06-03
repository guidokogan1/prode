# Bugs postmortem

Every meaningful bug encountered + root cause + fix. Read before refactoring anything in the persistence path.

## 1. Ghost tickets — empty allocations created via empty payload

**Symptom:** Guido had 72 tickets in DB but 65 of them had 0 rows in `ticket_allocations`. UI rendered "Tu jugada Corea del Sur · 0 · Gana" — wrong outcome, 0 amount.

**Root cause:** In `submitTicket`, the validation `matchedOutcomes.length !== payload.allocations.length` passed when both were 0 (`0 === 0`). Then:
1. Ticket upserted
2. `deleteExisting` nuked any prior allocations
3. `insert([])` was a no-op
4. Returned `ok:true` → frontend marked draft as `saved_remote`

**Trigger:** SyncRetry was firing on every app load and retrying old drafts with `saved_remote` status. Some of those drafts somehow had empty `allocations` array (possibly from a buggy `buildPresetAllocation` invocation or a stale-state condition). Each retry created another ghost ticket and nuked the previous one's data.

**Fix:** Added two guards before touching DB:
```ts
if (matchedOutcomes.length === 0) return 400
if (totalAllocated <= 0) return 400
```
Plus `validateAllocations` already enforced sum === 10000. Triple defense.

**Commit:** `7f446af`. Cleanup endpoint: `/api/admin/clean-empty-tickets`.

## 2. SyncRetry overwriting newer data across devices

**Symptom (potential, never hit prod):** User picks A on phone (DB=A, phone localStorage=A). Picks B on laptop (DB=B). Returns to phone, refresh → SyncRetry pushes A → DB overwritten with A. **B is lost.**

**Root cause:** I had extended SyncRetry to push ALL `saved_remote` drafts on app load (commit `4ff7e5c`) as part of recovering Guido's deleted tickets. That works once but is dangerous in multi-device scenarios because the local copy doesn't know it's stale.

**Fix:** Reverted SyncRetry to only retry `status: "sync_error"` drafts (commit `c6bda5a`). For recovery from corrupted server state, use `/api/admin/recover-from-events` instead.

## 3. football-data status mismatch — match never settled

**Symptom (would have manifested at first WC match):** My sync wrote `match.status = "final"` but `deriveMarketStatus` expects `"finished"`. Markets never transitioned to settled, leaderboard never updated.

**Root cause:** Typo in status enum mapping in sync-scores.

**Fix:** Changed `FINISHED → "finished"` (not `"final"`). Commit `9bf8f35`.

## 4. UI flash of just-saved match in deck

**Symptom:** User picks intensity, "Guardado" view shows, 760ms later resets to idle, briefly shows the SAME just-saved match for ~200ms before router.refresh lands and the match disappears.

**Root cause:** `currentIndex` wasn't being decremented, and the matches prop hadn't refreshed yet, so `deck[currentIndex]` was still the saved match for one render.

**Fix:** Introduced local `justSavedIds` set + `savedMatchSnapshot`. The filter excludes the just-saved match immediately (without waiting for server refresh), and the "Guardado" view renders from `savedMatchSnapshot` not `match`. Commit `777ad61`.

## 5. CTA button "Edita tus partidos" off-center

**Symptom:** Bottom-fixed CTA appeared shifted right relative to the bottom-nav and content cards.

**Root cause:** framer-motion applies transforms to its parent elements. When a child has `position: fixed`, the transformed ancestor becomes its containing block (per CSS spec). So `left: 50%` refers to the framer-motion parent's center, not the viewport.

**Fix:** Render the CTA via `createPortal(<div>, document.body)`. Now position:fixed correctly refers to the viewport. Also constrained max-width to `var(--shell-width) - 32px` so it aligns with the content. Commit `370fe16`.

## 6. SSR pendingPicks counter stale after save

**Symptom:** User saves match. Home counter says "68 por jugar" forever until manual reload.

**Root cause:** `getHomeSummary` runs server-side at page render. Save fires from client, ticket lands in DB, but home page doesn't re-render so the count stays stale.

**Fix:** After every save, fire `router.refresh()` in the `finally` block. Forces Next to re-render server components. Commit `8cd1eab` and later refined by Codex.

## 7. Champion save needed multiple seconds to confirm

**Symptom:** User taps "Guardar campeón", nothing visible happens for 1-2 seconds.

**Root cause:** Was awaiting the fetch round-trip before redirecting.

**Fix:** Optimistic redirect — `router.push("/")` immediately, then `fetch()` in background. If save fails (rare), the audit log catches it. Commit `0c777b8`.

## 8. Match kickoff times wrong (UTC seed vs reality)

**Symptom:** All Group A matches showed `11 jun · 13:00` ART when actually MEX-RSA opens at 16:00 ART.

**Root cause:** Seed script used a generic schedule template (all matches at 16:00 UTC of their matchday). Real WC schedule is staggered.

**Fix:** sync-scores cron also updates `kickoff_at` from football-data (delta > 60s triggers update). Commit `0abcad2`.

## 9. Timezone display always UTC

**Symptom:** `formatKickoffLabel` showed UTC times instead of ART.

**Root cause:** Hardcoded `timeZone: "UTC"` in Intl.DateTimeFormat.

**Fix:** Use `"America/Argentina/Buenos_Aires"`. Commit `ee76dfa`.

## 10. Match list sort priorityzed played-state over chronology

**Symptom:** In `/matches`, MEX-RSA (first WC match) appeared at the bottom of Group A.

**Root cause:** `getMatchActionPriority` sorted by user-action urgency (unplayed first, played later).

**Fix:** Pure chronological sort by kickoff_at. Commit `8cd1eab`.

## 11. Empty ranking showed fake demo data

**Symptom:** With 0 users registered, `/ranking` showed demo personas with hardcoded scores.

**Root cause:** `getRanking()` fell back to `getFallbackRanking()` (demo data) when leaderboard_snapshots was empty.

**Fix:** Return empty array for prod, with a clean empty state UI. Commit `a34c3ff`.

## 12. Vercel deploy failures from null assertion in DemoBar

**Symptom:** Vercel build failed after commit `dbb4846` with TS error: `'DemoPersonaSlug | null' is not assignable to type 'DemoPersonaSlug'`.

**Root cause:** Conditional `getActiveDemoPersonaSlug()` call returned null when demo is disabled, but `DemoFloatingBar` props expected non-null.

**Fix:** Moved the `getActiveDemoPersonaSlug()` call inside an async sub-component that only renders when `showDemoBar === true`. Commit `ae5772c`.

## 13. Vercel Hobby cron limits (project-wide config issue)

**Symptom:** Adding `*/5 * * * *` cron to `vercel.json` caused build failures.

**Root cause:** Vercel Hobby tier allows 1 cron, running once a day.

**Fix:** Moved all crons to GitHub Actions. Deleted `vercel.json`. Each cron is its own workflow file. Commit `548284c`.

## What hasn't been bug-yet but to watch for

- **Race on concurrent saves from same user:** last writer wins. Acceptable for friend usage but could matter at scale.
- **PIN brute force:** no rate limit. 4-digit PIN = 10k combos. Mitigation: it's a friends app, low risk.
- **Multi-device with localStorage drift:** see bug #2. Mitigated by `sync_error`-only retry.
- **football-data outage during a match:** lock-by-timestamp keeps picks safe. Scores just don't sync until API returns.
- **Vercel cold starts:** ~300-500ms latency on first request after idle. Cosmetic only.
