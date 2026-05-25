# AGENTS.md — @leanlog/ui

- Follow `docs/design-reference.md` and `docs/design-system.md` for every component change.
- CSS variables in `src/index.css` are the design token source of truth.
- Use Atomic Design folders: `src/atoms`, `src/molecules`, `src/organisms`, and `src/templates`.
- Raw native controls are allowed only in atoms.
- Do not use `.ll-*` component classes; reusable Tailwind strings belong in `src/styles/recipes.ts`.
- Keep components lean, consistent, and reusable.

# Invariants

- Every UI component in `packages/ui` must have a Storybook story.
