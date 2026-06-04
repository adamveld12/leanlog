---
name: leanlog-local-dev
description: LeanLog local development workflow for Vite, Wrangler Pages Functions, local D1, migrations, resets, and local secrets. Load when working on local dev, Cloudflare Pages Functions, D1, Wrangler scripts, or API proxy behavior.
---

# LeanLog Local Development

Always read `docs/local_dev_reference.md` before changing local development scripts, Wrangler config, D1 migration/reset commands, Vite proxy behavior, or local env documentation.

## Architecture

LeanLog local dev runs two local services:

```txt
Vite app:              http://localhost:5173
Wrangler Pages API:   http://localhost:8788
Vite proxy:           /api/* -> http://127.0.0.1:8788/api/*
Local D1 state:       apps/web/.wrangler/state
```

The app should keep calling relative `/api/*` paths. Do not hard-code the Wrangler port in frontend code.

## Commands

Run commands from the repo root unless noted otherwise.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Starts full stack: Vite + Wrangler Pages Functions. |
| `pnpm dev:web` | Alias for the full local web stack. |
| `pnpm dev:vite` | Starts Vite only on `localhost:5173`. |
| `pnpm dev:api` | Applies local D1 migrations, merges `.env.local` plus optional `.env.functions.local`, then starts Wrangler Pages on `localhost:8788`. |
| `pnpm dev:db:migrate` | Applies D1 migrations to local Wrangler D1 state. |
| `pnpm dev:db:reset` | Resets only local D1 schema/data, then reapplies migrations. |
| `pnpm dev:reset` | Removes all local Wrangler state, then reapplies D1 migrations. |

## Wrangler and D1 best practices

- Use Wrangler local mode for routine development; do not use remote D1 for local work.
- Run migrations before serving the local API. `pnpm dev:api` does this automatically.
- Prefer `pnpm dev:db:reset` when only tracker data/schema is broken.
- Use `pnpm dev:reset` only when all Wrangler local state should be wiped.
- Keep `apps/web/.wrangler/` untracked.
- Keep `apps/web/.dev.vars` and `apps/web/.env.functions.local` untracked.
- Restart `pnpm dev` after changing env files or `wrangler.toml`.
- `pnpm dev:api` must load `.env.local`; optional function secrets belong in `.env.functions.local`. The dev script generates `.dev.vars` temporarily for Wrangler and removes it on exit.

## Environment files

Reference env files; do not copy real keys into docs or skill files.

| File | Purpose |
| --- | --- |
| `apps/web/.env.local` | Local Vite values and Clerk test publishable key. Passed to Wrangler by `dev:api`. |
| `apps/web/.env.production` | Production build values. Not used for routine local dev. |
| `apps/web/.env.functions.local` | Optional local Wrangler runtime secrets. Must not be committed. |
| `apps/web/.env.functions.local.example` | Template for optional local secrets. |

Optional local label scan requires `GOOGLE_GENERATIVE_AI_API_KEY` in `apps/web/.env.functions.local`. Do not create `apps/web/.dev.vars` manually; the dev script owns that temporary file.

## Troubleshooting checklist

1. `/api/*` returns HTML: Vite proxy or Wrangler API is not running. Start `pnpm dev`.
2. `/api/*` returns `401`: auth is missing/expired or Clerk local key is wrong. Check `apps/web/.env.local` and sign in again.
3. D1 table missing: run `pnpm dev:db:migrate`.
4. D1 data broken: run `pnpm dev:db:reset`.
5. Wrangler state broken: run `pnpm dev:reset`.

## Validation

After local-dev changes, run:

```bash
pnpm -r lint
pnpm test
pnpm build
pnpm design:audit
```

Manual smoke:

```bash
pnpm dev
curl -i http://localhost:5173/api/days
```

Unauthenticated API requests should return `401 Unauthorized`, not `<!doctype html>`.
