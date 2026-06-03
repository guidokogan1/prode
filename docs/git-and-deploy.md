# Git, deploy, and credentials

## Repository ownership

**Repo:** `github.com/guidokogan1/prode`

**Important:** the repo is owned by GitHub account `guidokogan1`, NOT `guidokogan-bf` (the work account used in most other projects).

## Local git config

Default identity for this repo:
```
user.name = guidokogan-bf
user.email = guido@benefit-flow.com
```

That's wrong for pushing to `guidokogan1/prode`. You need to swap before pushing:

```bash
gh auth switch -u guidokogan1
git config user.name "guidokogan1"
git config user.email "guidokogan@gmail.com"

git commit -m "..."
git push origin main

# IMPORTANT: switch back so other work projects keep working
gh auth switch -u guidokogan-bf
git config user.name "guidokogan-bf"
git config user.email "guido@benefit-flow.com"
```

I've been wrapping this in a single chained command per commit. If you do it manually, don't forget the switch-back.

## Deployment pipeline

- **Vercel** auto-deploys on every push to `main`
- Project: `guidos-projects-96185957/prode` → URL `prode-indol.vercel.app`
- Vercel plan: Hobby (no 5-min crons — that's why we use GitHub Actions)
- Build time: ~1-2 minutes
- Deploy fails are visible at: `https://api.github.com/repos/guidokogan1/prode/commits/<sha>/status`

To check if deploy succeeded for a specific commit:
```bash
curl -s "https://api.github.com/repos/guidokogan1/prode/commits/<sha>/status" | jq .state
```

## Environment variables

### Vercel env (Production)

| Var | Purpose | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase URL | Supabase Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side admin key (bypasses RLS) | Supabase Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase Settings → API |
| `CRON_SECRET` | Auth for all cron endpoints | Generated, also in GH secrets |
| `ADMIN_DISPLAY_NAMES` | Comma-separated names allowed as admin | Set to `Guido` |
| `ADMIN_API_KEY` | Alternative admin auth via header | Optional |
| `FOOTBALL_DATA_TOKEN` | football-data.org API key | From their email on registration |

To rotate any of these:
1. Update in Vercel Settings → Environment Variables (Production)
2. Trigger a redeploy (Vercel Deployments → ⋯ → Redeploy)
3. If it's `CRON_SECRET`, ALSO update in GitHub repo Settings → Secrets → Actions

### `.env.local` (local dev)

Empty by default (Vercel pulls real values redact sensitive ones). For local development you'd need to manually copy the real values from Supabase.

## GitHub Actions secrets

Set in repo Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `APP_BASE_URL` | `https://prode-indol.vercel.app` |
| `CRON_SECRET` | Same value as Vercel `CRON_SECRET` |

If you regenerate `CRON_SECRET`, both must match or cron auth fails.

## TypeScript check before push

```bash
npx tsc -p tsconfig.typecheck.json --noEmit
```

Must pass clean. Vercel runs this implicitly as part of `next build`.

## Workflow check

Crons defined in `.github/workflows/cron-*.yml`. List active:
```bash
curl -s "https://api.github.com/repos/guidokogan1/prode/actions/workflows" | jq '.workflows[] | {state, name, path}'
```

Trigger manually:
```bash
gh workflow run cron-process-matches.yml -R guidokogan1/prode
```

## Common gotchas

1. **Don't push as guidokogan-bf** — Vercel webhook expects pushes from the repo owner; pushes from non-owners require write access on `guidokogan1/prode` (which guidokogan-bf doesn't have).
2. **Don't commit `Prodeicon.jpg` to public/** — it was deleted post-conversion. The PNGs in `public/icon-*.png` are derived from it.
3. **Don't commit `.env*` files** — `.env.local` is gitignored, but verify before pushing.
4. **Vercel cron limit is real** — keep cron config in `.github/workflows/`, NOT in `vercel.json`. Vercel will reject the deploy.
5. **`metadata.robots: { index: false }`** is intentional — we don't want the FIFA logo + branding indexed by Google (trademark risk).

## Running cron jobs locally for debugging

```bash
# Set required env vars in your shell
export CRON_SECRET="<value>"
export FOOTBALL_DATA_TOKEN="<value>"
export NEXT_PUBLIC_SUPABASE_URL="<value>"
export SUPABASE_SERVICE_ROLE_KEY="<value>"

# Start dev server
pnpm dev

# Trigger an endpoint
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-scores"
```
