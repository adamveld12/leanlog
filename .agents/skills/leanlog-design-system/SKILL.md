---
name: leanlog-design-system
description: Leanlog Atomic Design rules for UI work.
---

# Leanlog Design System

Read `docs/design-reference.md` and `docs/design-system.md` before UI changes.

## Architecture

- Atoms, molecules, organisms, and templates live in `packages/ui/src`.
- Route pages live in `apps/web/src/pages`.
- App pages import from `@leanlog/ui` — never reach into `packages/ui/src` directly.

### Tier Rules

| Tier | May use raw HTML elements | May use atoms | May use molecules | May use organisms |
|------|--------------------------|---------------|-------------------|-------------------|
| Atoms | Yes (that's their job) | No | No | No |
| Molecules | No | Yes | No | No |
| Organisms | No | Yes | Yes | No |
| Templates | No | Yes | Yes | Yes |
| App pages | No | Yes | Yes | Yes |

### Templates Are Slot-Based Layout Skeletons

Templates own **page structure** (AppShell, heading placement, section order). They accept `ReactNode` slots for content — they do NOT accept raw data and render it internally.

**Right** — template accepts a slot, app fills it:
```tsx
// Template
totalsSection: ReactNode
// App
<DayDetailTemplate totalsSection={<DailyTotalsCard ... />} />
```

**Wrong** — template accepts data and renders it:
```tsx
// Template
totals: { calories: number; protein: number; ... }
// Template renders <MacroSummaryLine {...totals} /> internally
```

App pages **must** use templates. Do not build page layouts manually with `AppShell` + `PageNavHeading`. Use the corresponding template: `DayListTemplate`, `DayDetailTemplate`, `MealEditTemplate`, `ProfileTemplate`, `LandingTemplate`.

## Enforcement

ESLint and the design audit script enforce these rules automatically. The pre-commit hook runs `pnpm -r lint` + `pnpm design:audit` and blocks commits that violate them.

### ESLint bans raw typography elements

In `apps/web/`: raw `<small>`, `<h3>`, `<h4>`, `<p>`, `<span>`, `<a>` are errors.
In `packages/ui/` molecules/organisms/templates: same ban. Only atoms may use raw elements. Stories are exempt.

### Design audit checks (`pnpm design:audit`)

- Raw typography elements in app pages and UI package (outside atoms)
- Inline recipe class duplication (`text-[var(--ll-warn)]`, `text-[var(--ll-text-muted)]`, section heading classes)
- Every component `.tsx` file must have a `.stories.tsx` file
- No legacy `ll-*` classes
- No forbidden directories

### QA commands (run after every UI change)

```
pnpm design:audit
pnpm lint
pnpm test
pnpm build
```

## Component Inventory

### Atoms (19)

Button, Card, Checkbox, Field, FileInput, HelperText, Input, IntegerInput, Label, NumberInput, PageTitle, ProgressBar, Radio, SectionHeading, Select, Spinner, Text, UnitText, WarningText

### Molecules (12)

ActionRow, DateSelect3, ListRow, LoadingState, MacroProgressBlock, MacroSummaryLine, Modal, RadioGroup, SectionCard, StatMetric, StickyFooter, Tabs

### Organisms (17)

AppPageHeading, AuthLanding, DailyTotalsCard, DayWeightCard, IngredientEntryCard, LabelScanCard, ListSectionCard, MonthCalendarCard, NutritionDatabaseEntryCard, NutritionDatabaseSearchCard, PageNavHeading, ProfileSectionCards, QuickActionsCard, ScanReviewModal, WeeklyStatsCard, WeightTrendCard

### Templates (7)

AppShell, DayDetailTemplate, DayListTemplate, ErrorTemplate, LandingTemplate, MealEditTemplate, ProfileTemplate

## Atom-to-HTML Usage Map

Use atoms instead of raw HTML elements at the molecule/organism/template/app level:

- `<small>` → `WarningText` (warn color) or `HelperText` (muted meta text)
- `<p>` → `Text as="p"` or `HelperText as="p"`
- `<span>` → `UnitText` (for unit suffixes: g, kcal, ml) or `Text as="span"`
- `<h3>`, `<h4>` → `SectionHeading` (has `as` and `noMargin` props)
- `<h2>` → `SectionHeading as="h2"` or `Text as="h2"`
- `<a>` → router Link component (app layer) or `renderNavLink` prop pattern
- `<div>` → allowed everywhere (layout container, not a typography element)

## Anti-Pattern Rules

- Never duplicate recipe class strings inline. Use the atom that encapsulates the recipe.
- Never fully override `SectionHeading`'s className to change typography — use `Text` with an explicit variant instead.
- Never override `HelperText`'s base styles — use `Text` with the appropriate variant.
- `SectionHeading` has a `noMargin` prop — use it instead of appending `mb-0` to className.
- Never use `window.confirm()` — use the `Modal` molecule for all confirmation dialogs.
- Never build page layouts with `AppShell` + `PageNavHeading` directly — use the template for that page.
- Every new component must have a Storybook story before committing.

## Conventions

### Macro ordering

Always **P / C / F** (Protein / Carbs / Fat). Use `MacroSummaryLine` for all macro displays.

### Shared utilities

- `calorieColor(calories, calorieTarget)` — exported from `MacroSummaryLine`. Returns `CSSProperties` for calorie threshold color coding. Do not duplicate this logic.

### Storybook

- Every component in atoms/, molecules/, organisms/, templates/ must have a `.stories.tsx` file.
- Story titles: `Design System/Atoms/Name`, `Design System/Molecules/Name`, etc.
- Typography.stories.tsx covers: PageTitle, SectionHeading, HelperText, WarningText, UnitText.

## Recipe Token Keys (`packages/ui/src/styles/recipes.ts`)

- `focusRing` — keyboard focus ring
- `transition` — standard motion transition
- `radius.control` / `radius.card` / `radius.pill` — border radius tokens
- `surface.card` — card border + background
- `text.title` / `text.sectionHeading` / `text.body` / `text.meta` / `text.pageSubtitle` / `text.warn` — typography variants
- `page.shell` / `page.main` — page layout
- `stack.sm` / `stack.lg` / `stack.row` / `stack.between` — flex column/row layouts
- `grid.two` / `grid.carbFiber` — grid layouts
- `control.base` / `control.size` — interactive control sizing
- `button.primary` / `button.secondary` / `button.ghost` / `button.danger` / `button.subtle` — button variant colors
- `input.base` — input field styling

Do not use `.ll-*` classes. Reusable class strings in `packages/ui` must be defined in `recipes.ts`.

## Analytics

Atoms emit analytics with `useAnalytics()`. Molecules, organisms, and templates decorate with `<AnalyticsScope>`. Set up with `<AnalyticsProvider>` at the app root.
