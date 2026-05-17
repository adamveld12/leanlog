# AGENTS.md — @leanlog/web

- Use UI elements from `@leanlog/ui` only.
- Do not create ad-hoc app-local buttons, inputs, tabs, cards, modals, or row actions.
- If a needed element does not exist, add it to `packages/ui` first, then consume it here.
- Keep app code focused on routes, layout composition, and state wiring.
- Follow `docs/design-reference.md` and `docs/design-system.md`.
