## Final Execution Plan (Updated)

### Global rules (enforced throughout)

- Run lint + format + tests before **every commit**.
- Keep workspace green at all times:
  - `pnpm lint`
  - `pnpm format` (or prettier on changed files)
  - `pnpm -r test`
  - `pnpm typecheck`
- All reusable UI components must live in `packages/ui` (app consumes them only).
- Use explicit destructive confirmation copy for destructive actions.

---

## Step 0 — Write plan file first

- Create `docs/prd_implementation_plan_01.md`
- Write the agreed implementation plan **verbatim** before any feature work

**Commit**

- `docs: add prd implementation plan 01`

---

## Step 1 — Test setup first (Vitest)

- Configure Vitest in monorepo (root + per-package where needed)
- Add test scripts for workspace:
  - `test`, `test:watch`, `test:coverage`
- Add initial passing smoke tests in:
  - `packages/ui`
  - `apps/web` (logic-focused)
- Ensure lint/format/typecheck/tests pass

**Commit**

- `chore(test): set up vitest across monorepo with baseline passing tests`

---

## Step 2 — Core foundation

- Add centralized domain modules:
  - normalization (uppercase names, dedupe keys)
  - rounding (1dp on blur)
  - selectors/totals/progress
  - section-level saved-state model
  - schema validation helpers
- Add unit tests for all core utilities

**Commit**

- `refactor(core): add normalization rounding selectors and section save-state primitives`

---

## Step 3 — UI library expansion (`packages/ui`)

- Build/extend all reusable components in UI package:
  - Inputs, NumberInput, Modal/Confirm, Tabs, SearchInput, SwipeRow, DateSelect3, StickyFooter, list rows, etc.
- Add unit tests for UI component behavior
- Add Storybook stories:
  - basic components
  - composed page-sections (meal row, targets block, totals panel, ingredient flow)

**Commit**

- `feat(ui): add core reusable components with tests and storybook coverage`

---

## Step 4 — Meal Edit page first (`/day/:dayId/meal/:mealId`)

- Implement full PRD meal edit flow using UI package components
- Section boundaries for saved state:
  - Meal Name
  - Ingredient Form
  - Add Ingredient Flow
- Behaviors:
  - required meal name guard; default action stay/edit
  - discard removes whole meal draft
  - ingredient CRUD + warnings
  - library + new ingredient tabs
  - dedupe prompt
  - sticky totals
  - live save + persistent green section confirmation until next edit
- Add unit tests for reducers/selectors/helpers used by meal edit

**Commits**

1. `feat(meal-edit): add meal name guard and discard-draft flow`
2. `feat(meal-edit): implement ingredient crud with warning validations`
3. `feat(meal-edit): add library and new ingredient flows with dedupe`
4. `feat(meal-edit): add sticky totals and section-level save confirmations`

---

## Step 5 — Settings page targets second (`/settings`)

- Section boundaries:
  - Targets
  - Theme
  - Data Import/Export
- Implement:
  - live-save targets + blur rounding + section green saved border
  - theme system/light/dark immediate apply
  - export/import with strict schema/version fail + destructive replace confirm
- Add unit tests for import validation + target update logic

**Commits**

1. `feat(settings): implement live-save target controls with blur rounding`
2. `feat(settings): add theme selection and persistence`
3. `feat(settings): add strict import-export with destructive replace confirmation`

---

## Step 6 — Day Detail page (`/day/:dayId`)

- Sticky totals panel vs targets
- Meal summaries and add meal flow
- Delete interactions:
  - mobile swipe reveal
  - desktop always-visible delete button
- explicit destructive copy
- Add logic tests for totals/progress

**Commit**

- `feat(day-detail): implement totals meal list and device-specific delete actions`

---

## Step 7 — Day List page (`/`)

- Newest-first rows with summary/status
- Add day via 3-select date picker (month/day/year), default today
- Duplicate-date prevention
- Delete interactions:
  - mobile swipe reveal
  - desktop always-visible delete button
- explicit destructive copy
- Add tests for date helpers and duplicate prevention

**Commit**

- `feat(day-list): implement day summaries add-day picker and delete interactions`

---

## Step 8 — QA, polish, release readiness

- Full PRD checklist pass
- Responsive + accessibility + motion polish
- Final test/lint/typecheck/build pass
- Cloudflare readiness validation

**Commit**

- `chore(release): prd completion qa polish and deployment readiness`
