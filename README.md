# leanlog

Leanlog is a mobile-first nutrition tracker for meals, calories, and macros.

## Stack

- pnpm workspaces (monorepo)
- React + TypeScript
- Vite
- Storybook
- Tailwind CSS
- ESLint + Prettier + Husky

## Packages

- `apps/web` — main app
- `packages/ui` — shared UI components + Storybook
- `apps/mobile` — Android app (Expo / React Native, on-device data, Health Connect); see [docs/mobile.md](docs/mobile.md)

## Local development

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm storybook
pnpm lint
pnpm typecheck
pnpm build
```

## License

MIT
