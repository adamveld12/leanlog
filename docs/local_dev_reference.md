# LeanLog Local Development Reference

LeanLog local development runs the Vite app and Cloudflare Pages Functions side by side. Open the app at `http://localhost:5173`; Vite proxies `/api/*` requests to Wrangler Pages Functions on `http://localhost:8788`.

```txt
Browser -> Vite :5173 -> /api proxy -> Wrangler Pages :8788 -> functions/api/** -> local D1 DB
```

## Quick start

From the repository root:

```bash
pnpm install
pnpm dev
```

Then open:

```txt
http://localhost:5173
```

`pnpm dev` starts the full stack and runs D1 migrations before the local API starts.

## Commands

| Command               | What it does                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| `pnpm dev`            | Starts the full local stack: Vite + Wrangler Pages Functions.                                              |
| `pnpm dev:web`        | Alias for the full local web stack.                                                                        |
| `pnpm dev:vite`       | Starts only Vite on `localhost:5173`. Useful for frontend-only debugging.                                  |
| `pnpm dev:api`        | Applies local D1 migrations, then starts Wrangler Pages Functions on `localhost:8788`.                     |
| `pnpm dev:db:migrate` | Applies migrations from `packages/data-d1/drizzle` to local D1 state.                                      |
| `pnpm dev:db:reset`   | Resets only the local D1 app schema/data, then reapplies migrations. Preserves other Wrangler local state. |
| `pnpm dev:reset`      | Removes all local Wrangler state under `apps/web/.wrangler/state`, then reapplies D1 migrations.           |
| `pnpm -r lint`        | Typechecks and lints all packages.                                                                         |
| `pnpm test`           | Runs the test suite.                                                                                       |
| `pnpm build`          | Builds all packages/apps.                                                                                  |

The same commands can be run through the web package directly:

```bash
pnpm --filter @leanlog/web dev:api
pnpm --filter @leanlog/web dev:db:reset
```

## Ports and routing

| Service        | URL                           | Notes                                     |
| -------------- | ----------------------------- | ----------------------------------------- |
| Vite           | `http://localhost:5173`       | Browser app and HMR.                      |
| Wrangler Pages | `http://localhost:8788`       | Local Pages Functions runtime.            |
| API proxy      | `http://localhost:5173/api/*` | Proxied to `http://127.0.0.1:8788/api/*`. |

Override the API proxy target only when debugging a different local API server:

```bash
LEANLOG_API_PROXY_TARGET=http://127.0.0.1:8789 pnpm dev:vite
```

Application code should continue to call relative `/api/*` paths. Do not hard-code the Wrangler port in app fetch calls.

## Environment files

Do not copy real keys into docs. Reference and maintain the local env files instead:

| File                                    | Purpose                                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web/.env.local`                   | Local Vite values. Must contain the Clerk test publishable key. Also passed to Wrangler by `dev:api`. |
| `apps/web/.env.production`              | Production build values. Not used for normal local dev.                                               |
| `apps/web/.env.functions.local`         | Optional untracked Wrangler runtime secrets for local-only function testing.                          |
| `apps/web/.env.functions.local.example` | Template for optional local Wrangler secrets.                                                         |

Required for normal local tracker development:

| Env var                      | Source                | Used by                             |
| ---------------------------- | --------------------- | ----------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | `apps/web/.env.local` | Vite app and Pages auth middleware. |

Optional for local label scan testing:

| Env var                        | Source                          | Used by                                          |
| ------------------------------ | ------------------------------- | ------------------------------------------------ |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `apps/web/.env.functions.local` | `functions/api/scan-nutrition.ts`.               |
| `VITE_POSTHOG_API_KEY`         | `apps/web/.env.functions.local` | Server-side PostHog capture from scan nutrition. |
| `VITE_POSTHOG_HOST`            | `apps/web/.env.functions.local` | Server-side PostHog host.                        |

To set up optional local function secrets:

```bash
cp apps/web/.env.functions.local.example apps/web/.env.functions.local
# Edit apps/web/.env.functions.local locally. Do not commit it.
```

Do not create `apps/web/.dev.vars` manually for LeanLog local dev. `pnpm dev:api` generates a temporary `.dev.vars` from `.env.local` and optional `.env.functions.local` because Wrangler Pages loads `.dev.vars` preferentially. If a manual `.dev.vars` already exists, `pnpm dev:api` exits with a clear error.

## Wrangler Pages Functions

The local API is the real Cloudflare Pages Functions code under:

```txt
apps/web/functions/api/**
```

`apps/web/functions/api/_middleware.ts` validates Clerk JWTs. Local auth depends on the Clerk test publishable key from `apps/web/.env.local`, and JWKS verification requires network access to Clerk.

Start only the API runtime:

```bash
pnpm dev:api
```

This runs `apps/web/scripts/dev-api.mjs`, which:

1. Runs `pnpm dev:db:migrate`.
2. Generates a temporary `apps/web/.dev.vars` from `apps/web/.env.local` and optional `apps/web/.env.functions.local`.
3. Starts `wrangler pages dev ./public --port 8788 --persist-to .wrangler/state`.
4. Deletes the generated `.dev.vars` when Wrangler exits.

The generated `.dev.vars` keeps optional function secrets separate while still ensuring `.env.local` is loaded for the Clerk test key.

## Local D1

Local D1 uses Wrangler local storage. It does not mutate remote Cloudflare D1 databases.

| Item                | Value                      |
| ------------------- | -------------------------- |
| Binding             | `DB`                       |
| Wrangler config     | `apps/web/wrangler.toml`   |
| Migration directory | `packages/data-d1/drizzle` |
| Local state         | `apps/web/.wrangler/state` |

Apply migrations manually:

```bash
pnpm dev:db:migrate
```

Migrations are also applied automatically every time `pnpm dev:api` or `pnpm dev` starts.

## Resetting local data

Use the least destructive reset that solves the problem.

### Reset only local D1

```bash
pnpm dev:db:reset
```

This executes `apps/web/scripts/reset-local-d1.sql`, dropping LeanLog app tables and D1 migration metadata, then reapplies migrations. It preserves other Wrangler local state.

### Reset all Wrangler local state

```bash
pnpm dev:reset
```

This removes `apps/web/.wrangler/state` and then reapplies D1 migrations. Use this when Wrangler local storage itself appears corrupted or when you want a full local runtime reset.

## Smoke checks

With `pnpm dev` running:

```bash
curl -i http://localhost:5173/api/days
```

Without auth, the expected response is:

```txt
HTTP/1.1 401 Unauthorized
Unauthorized
```

If you see `<!doctype html>`, Vite is serving the SPA fallback and the API proxy or Wrangler API process is not working.

Browser smoke test:

1. Open `http://localhost:5173/track`.
2. Sign in with the Clerk test account.
3. Confirm tracker data loads without an invalid JSON payload error.
4. Create a day or meal.
5. Restart `pnpm dev`; local data should persist.
6. Run `pnpm dev:db:reset`; local D1 data should be reset.

## Troubleshooting

### `/api/*` returns HTML

Cause: Vite handled the request instead of proxying to Wrangler.

Fix:

```bash
pnpm dev
# or, in another terminal:
pnpm dev:api
```

Confirm Wrangler is listening on `localhost:8788`.

### `/api/*` returns `401 Unauthorized`

Cause: no Clerk token, expired token, or local Clerk issuer mismatch.

Fix:

- Sign in again at `http://localhost:5173`.
- Confirm `apps/web/.env.local` contains the local/test Clerk publishable key.
- Use `pnpm dev` or `pnpm dev:api`; running `wrangler pages dev` directly can fall back to production `[vars]` in `wrangler.toml` and cause test-token issuer mismatches.
- Restart `pnpm dev` after changing env files.

### D1 table does not exist

Cause: local migrations have not been applied or local D1 state was partially reset.

Fix:

```bash
pnpm dev:db:migrate
```

If that is not enough:

```bash
pnpm dev:db:reset
```

### Local D1 data looks stale or broken

First reset only D1:

```bash
pnpm dev:db:reset
```

If Wrangler state itself seems corrupt, reset all local Wrangler state:

```bash
pnpm dev:reset
```

### Label scan fails locally

Cause: `GOOGLE_GENERATIVE_AI_API_KEY` is missing or invalid.

Fix:

```bash
cp apps/web/.env.functions.local.example apps/web/.env.functions.local
# Add GOOGLE_GENERATIVE_AI_API_KEY locally, then restart pnpm dev.
```

### `pnpm dev:api` fails with `.dev.vars already exists`

Cause: a prior run was killed before cleanup, for example by OOM or `kill -9`.

Fix:

```bash
rm apps/web/.dev.vars
pnpm dev:api
```

### Wrangler cannot find `./public`

Cause: `apps/web/public` is missing or was deleted locally.

Fix: restore `apps/web/public` from git before running `pnpm dev:api`.

## Best practices

- Use `pnpm dev` for normal local app work.
- Use `pnpm dev:vite` only when intentionally debugging frontend-only behavior.
- Keep API calls relative (`/api/...`) so Vite can proxy them.
- Keep `.wrangler/`, `.dev.vars`, and `.env.functions.local` untracked.
- Prefer `dev:db:reset` before `dev:reset`; full Wrangler resets are more destructive.
- Never use remote D1 for routine local development.
- Restart `pnpm dev` after changing env files or Wrangler config.
