# @leanlog/web

Main Leanlog web app built with React + Vite and Cloudflare Pages Functions.

## Local development

From repo root:

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the full local stack:

- Vite app on `http://localhost:5173`
- Wrangler Pages Functions on `http://localhost:8788`
- Vite proxy for `/api/*` requests
- Local D1 migrations before API startup

For the complete local development reference, see:

```txt
../../docs/local_dev_reference.md
```

Useful commands:

```bash
pnpm dev:vite        # Vite only
pnpm dev:api         # Wrangler API only, with migrations first
pnpm dev:db:migrate  # Apply local D1 migrations
pnpm dev:db:reset    # Reset only local D1 and reapply migrations
pnpm dev:reset       # Reset all Wrangler local state and reapply migrations
```

Build:

```bash
pnpm --filter @leanlog/web build
```
