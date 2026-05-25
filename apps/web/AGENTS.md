# AGENTS.md — @leanlog/web

- Route-level pages live in `apps/web/src/pages`.
- Use UI elements and templates from `@leanlog/ui` only.
- Do not create ad-hoc app-local buttons, inputs, tabs, cards, modals, templates, or row actions.
- If a needed element does not exist, add it to `packages/ui` first, then consume it here.
- Keep app code focused on routes, layout composition, and state wiring.
- Follow `docs/design-reference.md` and `docs/design-system.md`.
