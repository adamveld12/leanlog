---
name: leanlog-design-system
description: Leanlog Atomic Design rules for UI work.
---

# Leanlog Design System

- Read `docs/design-reference.md` and `docs/design-system.md` before UI changes.
- Atoms, molecules, organisms, and templates live in `packages/ui/src`.
- Route pages live in `apps/web/src/pages`.
- Templates live in `packages/ui/src/templates` and receive data/callbacks as props.
- Storybook documents UI templates, not app route pages.
- Raw native controls are only allowed in atoms.
- Reusable class strings in `packages/ui` must be defined in `packages/ui/src/styles/recipes.ts`.
- App pages are not checked against `recipes.ts`, but must consume `@leanlog/ui`.
- Do not use `.ll-*` classes.
- Atoms emit analytics with values; molecules, organisms, and templates decorate analytics with scope.
- Run `pnpm design:audit`, `pnpm lint`, `pnpm test`, and `pnpm build` after UI changes.
