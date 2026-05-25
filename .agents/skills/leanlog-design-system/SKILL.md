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
- Prefer existing atoms before adding molecule/organism markup: Button, Card, Field, FileInput, HelperText, Input, IntegerInput, Label, NumberInput, PageTitle, ProgressBar, Radio, SectionHeading, Select, Text, UnitText, and WarningText.
- Reusable class strings in `packages/ui` must be defined in `packages/ui/src/styles/recipes.ts`.
- App pages are not checked against `recipes.ts`, but must consume `@leanlog/ui`.
- Do not use `.ll-*` classes.
- Atoms emit analytics with values; molecules, organisms, and templates decorate analytics with scope.
- Run `pnpm design:audit`, `pnpm lint`, `pnpm test`, and `pnpm build` after UI changes.

## Component Inventory

### Atoms (17)
Button, Card, Field, FileInput, HelperText, Input, IntegerInput, Label, NumberInput, PageTitle, ProgressBar, Radio, SectionHeading, Select, Text, UnitText, WarningText

### Molecules (9)
ActionRow, DateSelect3, ListRow, MacroSummaryLine, Modal, RadioGroup, SectionCard, StickyFooter, Tabs

### Organisms (9)
AddDayControl, AppPageHeading, AuthLanding, DailyTotalsCard, IngredientEntryCard, ListSectionCard, PageNavHeading, ProfileSectionCards, ScanReviewModal

### Templates (6)
AppShell, DayDetailTemplate, DayListTemplate, LandingTemplate, MealEditTemplate, ProfileTemplate

## Atom-to-HTML Usage Map

Use atoms instead of raw HTML elements at the molecule/organism/template level:

- `<small>` → use `WarningText` (warn color) or `HelperText` (muted meta text)
- `<p>` → use `Text as="p"` or `HelperText as="p"`
- `<span>` → use `UnitText` (for unit suffixes: g, kcal, ml) or `Text as="span"`
- `<h3>`, `<h4>` → use `SectionHeading` (has `as` and `noMargin` props)
- `<h2>` → use `SectionHeading as="h2"` or `Text as="h2"`
- `<a>` → use router Link component (app layer) or `renderNavLink` prop pattern; never raw `<a>` outside atoms

## Anti-Pattern Rules

- Never duplicate recipe class strings inline. Use the atom that encapsulates the recipe instead.
- Never fully override SectionHeading's className to change typography — use `Text` with explicit variant instead.
- Never override HelperText's base styles — use `Text` with the appropriate variant.
- `SectionHeading` has a `noMargin` prop to suppress `mb-2` — use it instead of appending `mb-0` to className.

## Macro Ordering Convention

Macro order is always **P / C / F** everywhere (Protein / Carbs / Fat). Use `MacroSummaryLine` for all macro displays.

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

## Analytics System

Atoms emit analytics with `useAnalytics()` values. Molecules, organisms, and templates decorate analytics with `<AnalyticsScope>`. Set up with `<AnalyticsProvider>` at the app root. Available providers: `ConsoleAnalyticsProvider`.
