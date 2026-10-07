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

### Interactive content lives inside cards

Buttons, inputs, and other controls belong **inside** a `SectionCard` (or a card organism), not floated as bare siblings between cards. Specifically, a control atom must never be a direct sibling of a `*Card` inside a `role="tabpanel"` subtree — give the card a slot/prop for the action instead (e.g. the search card's `onScanLabel`/`onCreateNew`). `design:audit` blocks this for tab-panel composition.

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
- **Repositories verify ownership** (`userId`) before mutating, and return `null` / throw typed errors (e.g. `DuplicatePlanNameError`) that API routes map to status codes.
- **Optimistic store updates must mirror every server side-effect.** If a server mutation has a side-effect (e.g. adding an ingredient auto-logs a template meal), reproduce it in **every** store reducer that triggers that mutation — not just the obvious one. Missing one leaves the UI stale until reload.
- **Day-scoped mutations are timezone-guarded.** The api client sends `X-Leanlog-Local-Date`; day/meal/ingredient endpoints reject past-day edits via the shared guard. New day-scoped endpoints must use it.

## Testing conventions

- The vitest setup files (`packages/ui/src/test/setup.ts`, `apps/web/src/test/setup.ts`) run a global `afterEach(cleanup)` — **don't** add per-file `afterEach(cleanup)`.
- The shared api mock in `apps/web/src/test/setup.ts` is `satisfies typeof api`, so **adding a method to `src/api.ts` requires adding it to the mock** (TypeScript will tell you).
- For store-dependent UI, render the app/route (`renderApp(route)` pattern) rather than `renderHook(StateProvider)` — the mocked `useAuth` interacts poorly with `renderHook`.
- `@leanlog/data-d1` has a real unit-test harness: `@cloudflare/vitest-pool-workers` + Miniflare D1 (`vitest.config.ts` reads every migration via `readD1Migrations`, and `test/setup.ts`'s `beforeAll` applies them via `applyD1Migrations` before each test file). Write repository tests as `src/repositories/*.test.ts` using `import { env } from 'cloudflare:test'` — see `plans.test.ts` or `days.test.ts` for the pattern.

## Mobile app (`apps/mobile`)

The Android app (#75) is an Expo / React Native app that keeps all data on the phone. See `docs/mobile.md` for local dev, Storybook, migrations, and EAS builds.

- **It needs a dev client, not Expo Go.** It uses native modules (SQLite, Health Connect, document picker), so run it with `pnpm --filter @leanlog/mobile android` or an EAS `development` build. Agents and cloud sessions have **no Android SDK or emulator**: you can run `tsc`, ESLint, jest and `expo export --platform android`, but you cannot see the app. Never claim device behaviour was checked.
- **It has its own UI kit.** Screens and molecules build from atoms in `apps/mobile/src/ui/atoms`. ESLint bans `Text`, `TextInput`, `Pressable` and `TouchableOpacity` from `react-native` outside `src/ui/atoms` (tests are exempt), and `design:audit` requires a `.stories.tsx` next to every atom, molecule and organism. The kit mirrors `@leanlog/ui` by name and copies its `--ll-*` tokens (`src/ui/theme.ts`); keep the two in step by hand. Same rule as the web app: controls live inside a `Card`, passed as `headerAction`, not floated between cards.
- **It is in the typecheck graph.** `apps/mobile` compiles `@leanlog/data-access` from source, so a schema or type change there must compile in `data-access`, `data-d1`, `web` **and** `mobile` in the same commit. Code that goes into data-access must also satisfy its settings (`erasableSyntaxOnly`, `verbatimModuleSyntax`): `import type`, no enums, namespaces or constructor parameter properties.
- **Storage.** SQLite through drizzle. Change `src/db/schema.ts`, then `pnpm --filter @leanlog/mobile db:generate` and commit the generated migration. Multi-row writes go through `withTransaction` (it replaces `db.transaction`, which can't run on the better-sqlite3 driver the tests use). Past days are read-only: mutations take `today` and throw `PastDayLockedError`. Targets are re-derived for today only.
- **Health Connect.** Only `src/health/nativeClient.ts` loads `react-native-health-connect`; everything else uses the `HealthConnectClient` interface so it can be tested against `FakeHealthConnect`. Repositories queue writes in `hc_queue` in the same transaction as the change; the service flushes them. Imported weights are never queued back, and Leanlog's own records (by data origin) are never imported.
- **Analytics and errors.** Analytics ships off: with no `EXPO_PUBLIC_POSTHOG_KEY` every call is a no-op and the Settings toggle is hidden. Events carry counts only, never food, weight or measurements. Unexpected failures go to the local `error_log` (last 200) via `logError` / `reportError`; anticipated ones (`DomainError`, validation) do not.
- **Tests (jest, headless).** `src/test/setup.ts` registers one global `afterEach(cleanup)` (don't add per-file cleanup) and mocks every native module: `useDatabase` (in-memory SQLite), `nativeClient` (fake Health Connect, unavailable by default; use `setTestHc`), `nativeIo` (fake share sheet and picker), `posthog-react-native`, and `src/clock` (pinned to Tue 2026-10-06 09:00 local). Test screens by rendering the real app with `renderApp(route)`; seed with `seedOnboarded(testDb())` and the repositories. Run `pnpm --filter @leanlog/mobile test`.
- **Backup format.** The export file is versioned (`MobileExportSchema`, `version: 1`). `src/backup/__fixtures__/export-v1.json` is the contract; changing the format means bumping `version`.
- **react-doctor** scans `apps/mobile` in CI. Disable a finding only with a file-scoped `// react-doctor-disable-next-line react-doctor/<rule>` plus a justification.

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
