## Workflow

- Always make regular git commits at logical points
- Each git commit should be a working, running state of the repo
- _ONLY_ make commits using conventional commit style.

## Design System Enforcement

The pre-commit hook runs `pnpm -r lint` + `pnpm design:audit` and blocks commits that violate design system rules. If your commit is blocked:

1. Read the error messages — they tell you which atom to use instead of the raw element
2. Fix the violations (do NOT bypass with `--no-verify`)
3. If you need a legitimate exemption, use `// eslint-disable-next-line no-restricted-syntax` with a justification comment

Every UI component must have a Storybook story. The audit enforces this.

### Raw HTML elements are banned

**Never use raw HTML `<button>`, `<input>`, `<select>`, `<textarea>`, or `<label>` elements.** ESLint will block your commit if you do. Always use the corresponding atoms from `@leanlog/ui`:

| Raw element                | Use instead                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| `<button>`                 | `<Button>`                                                              |
| `<input>`                  | `<Input>`, `<NumberInput>`, `<IntegerInput>`, or `<FileInput>`          |
| `<select>`                 | `<Select>`                                                              |
| `<label>`                  | `<Label>`                                                               |
| `<textarea>`               | Design system atom (none yet — create one if needed)                    |
| `<h1>`–`<h4>`              | `<PageTitle>`, `<SectionHeading>`, or `<Text>` with appropriate variant |
| `<p>`, `<span>`, `<small>` | `<Text>`, `<HelperText>`, `<WarningText>`, `<UnitText>`                 |
| `<a>`                      | `<Button>` with `as="a"` or React Router `Link`                         |

This applies everywhere — `apps/web/`, `packages/ui/` (outside atoms), and any new packages. The only place raw elements are allowed is inside atom component implementations in `packages/ui/src/atoms/`.

## Commit & push gates

Two git hooks run automatically — know which checks block where:

| Hook           | Runs                                                                                      | Blocks on                           |
| -------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| **pre-commit** | `pnpm -r lint` (tsc + eslint), `pnpm react-lint`, `pnpm design:audit`, `pnpm lint-staged` | **tsc, eslint, and `design:audit`** |
| **pre-push**   | `pnpm test`                                                                               | **any failing test**                |

- **`design:audit` is a hard gate** — it enforces atom usage, story coverage, and recipe-class duplication (see table below). Fix violations; never `--no-verify`.
- **`react-lint` (react-doctor) is a blocking gate in CI** (`pnpm react-lint:ci`, `--blocking warning`) — the #46 backlog is at zero. The pre-commit `pnpm react-lint` is still advisory (changed-files only) so you can commit WIP, but **CI fails on any new warning**, so fix findings you introduce. To accept a genuine false positive / intentional pattern, add a **file-scoped inline** `// react-doctor-disable-next-line react-doctor/<rule>` with a justification comment — never a global rule-off in config. The `IngredientEntry`/`StateProvider` split + `useReducer` work is deferred to **#50**.
- **Tests gate on push, not commit.** Commit work-in-progress freely (including red TDD tests); the suite must be green to push.

### TDD in this monorepo

- Because tests run on **pre-push**, you can commit a red test. But **pre-commit still runs `tsc`**, so a test that imports a not-yet-created symbol won't commit — either stub the symbol first, or land the test and its implementation in the same commit and demonstrate "red" by running `pnpm test` before writing the impl.
- `tsc` runs across **all** packages, so a schema change in `@leanlog/data-access` forces `@leanlog/data-d1` and `@leanlog/web` to compile in the **same commit**. Plan commits around the typecheck graph, not just the feature step.

### design:audit recipe-duplication rules

Inlining these utility strings fails the audit — use the atom instead (applies in `packages/ui` and app pages):

| Inlined class                                       | Use instead                              |
| --------------------------------------------------- | ---------------------------------------- |
| `text-[var(--ll-text-muted)]`                       | `<HelperText>` / `<UnitText>` / `<Text>` |
| `text-[var(--ll-warn)]`                             | `<WarningText>`                          |
| `text-xs font-semibold uppercase tracking-[0.08em]` | `<SectionHeading>`                       |

## Backend & store conventions

Two production bugs in #45 came from missing these — follow them:

- **D1 has no implicit transaction across `await`s.** Any repository write that touches more than one row/table must use `d.batch([...])` so it's atomic (e.g. copy-on-create inserting a row + its children). Sequential `await`s can leave half-written state on failure.
- **Snapshot-on-copy:** when copying X into Y (e.g. template → day), mint **new** ids and copy values by reference-free value so later edits to the source never mutate the copy.
- **Repositories verify ownership** (`userId`) before mutating, and return `null` / throw typed errors (e.g. `DuplicateTemplateNameError`) that API routes map to status codes.
- **Optimistic store updates must mirror every server side-effect.** If a server mutation has a side-effect (e.g. adding an ingredient auto-logs a template meal), reproduce it in **every** store reducer that triggers that mutation — not just the obvious one. Missing one leaves the UI stale until reload.
- **Day-scoped mutations are timezone-guarded.** The api client sends `X-Leanlog-Local-Date`; day/meal/ingredient endpoints reject past-day edits via the shared guard. New day-scoped endpoints must use it.

## Testing conventions

- The vitest setup files (`packages/ui/src/test/setup.ts`, `apps/web/src/test/setup.ts`) run a global `afterEach(cleanup)` — **don't** add per-file `afterEach(cleanup)`.
- The shared api mock in `apps/web/src/test/setup.ts` is `satisfies typeof api`, so **adding a method to `src/api.ts` requires adding it to the mock** (TypeScript will tell you).
- For store-dependent UI, render the app/route (`renderApp(route)` pattern) rather than `renderHook(StateProvider)` — the mocked `useAuth` interacts poorly with `renderHook`.
- `@leanlog/data-d1` has **no unit-test harness yet** (lint = `tsc` only); repository logic is currently covered only by typecheck + web integration tests. Adding a Workers/Miniflare D1 test pool is the highest-value testing investment (tracked separately).

## SKILLS LOADING HINTS

You **MUST PROACTIVELY** load these skills in these following scenarios. Also respect the skill hints in the skill.md themselves.

- **BEFORE** you edit or read any `.tsx/jsx` file, frontend page, react components or in the `@packages/ui` module

```
skill:react-best-practices
skill:typescript-pro
skill:leanlog-design-system

@docs/design-reference.md
@docs/design-system.md
```

- When I ask you to plan implementation, load these immediately

```
skill:tdd
skill:react-best-practices
skill:context7-cli
```

- When asked about local dev, load `skill:leanlog-local-dev`.
