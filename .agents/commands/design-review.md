---
description: Review Leanlog UI changes for Atomic Design compliance.
---

Review the current diff against:

- `docs/design-reference.md`
- `docs/design-system.md`
- `packages/ui/specs/*.md`

Check Atomic Design boundaries, page/template placement, raw-control usage, `.ll-*` removal, `packages/ui` recipe usage, Storybook taxonomy, accessibility, mobile-first layout, and analytics value/scope behavior.

Run:

```bash
pnpm design:audit
pnpm lint
pnpm test
pnpm build
```
