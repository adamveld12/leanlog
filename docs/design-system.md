# Leanlog Design System

## Scope

- **Role:** Implementation rules for tokens and components.
- **Source:** CSS variables from `packages/ui/src/index.css`.
- **Usage:** App pages consume UI package components and token classes only.

## Color Tokens (Monochrome + Semantics)

- `--ll-bg`: page background
- `--ll-surface`: primary surface
- `--ll-text`: primary text
- `--ll-text-muted`: secondary text (dark mode uses stronger muted contrast)
- `--ll-line`: default border/hairline
- `--ll-line-strong`: emphasized border
- `--ll-danger`: destructive action
- `--ll-warn`: warning text
- `--ll-saved`: saved-state outline
- `--ll-focus`: neutral gray focus ring
- **Contrast requirement:** target WCAG AA for body/UI text

## Typography

- **Family:** `ui-sans-serif, system-ui` (single family system-wide).
- **Title:** 24/30, weight 600.
- **Section heading:** 12/16, weight 600, uppercase, 0.08em tracking.
- **Subheading:** 14px, weight 600, tracking-tight, primary color — modal titles and card-level headings.
- **Body:** 14/20, weight 400.
- **Meta:** 12/16, weight 500, muted color.
- **Label:** 12px, weight 500, muted color — form field labels.
- **Numbers:** Use tabular numbers for totals.

## Spacing Scale

- Base scale: `4, 8, 12, 16, 20, 24`
- **Stack gap scale** (from `recipes.stack.*`): 6px (`xs`), 8px (`row`/`actions`), 10px (`sm`), 12px (`md`/`rowMd`), 16px (`lg`).
- **Containers:** default vertical rhythm uses 12 or 16; cards and modals use `p-4` (16px) internal padding.
- **Sections:** internal padding 12–16.
- **Rule:** Do not invent one-off spacing values. Use the stack-gap and base-scale values above.
- **Exception:** Calendar grid uses a 2px (`gap-0.5`) column/row gap — the only sanctioned sub-4px gap.

## Radius Scale

- `10` (controls — `radius.control`)
- `14` (cards/sections — `radius.card`)
- `999` (pill actions — `radius.pill`)
- `8` (`radius.controlInner`) — **only** allowed when nested inside a `radius.control` container that supplies 2px padding (10 − 2 = 8). Do not use standalone.
- **Rule:** Only these radii are allowed.

## Borders + Elevation

- **Default line:** `1px solid var(--ll-line)`
- **Strong line:** `1px solid var(--ll-line-strong)`
- **Shadow:** Minimal soft shadow only on modal layers.
- **Rule:** Avoid stacked heavy shadows.

## Motion

- **Duration:** 120ms–180ms
- **Curve:** `cubic-bezier(0.2, 0.8, 0.2, 1)`
- **Animated properties:** transform, opacity, border-color
- **Rule:** No layout-jank animations.
- **Exception:** The `Spinner` atom uses a continuous 0.75s linear rotation — the only intentional infinite animation. Pauses automatically under `prefers-reduced-motion`.

## Component Baselines

- **Button variants (strict):**
  - `primary` create/save/proceed
  - `secondary` back/cancel/navigation
  - `subtle` low-priority tertiary actions
  - `danger` destructive only
  - `ghost` alternate secondary in dense areas
- **Controls carry no outer margins.** Vertical rhythm comes exclusively from `recipes.stack.*` gaps (and SectionCard's internal stack). Do not add `my-*` on buttons or inputs outside the recipe.
- **Input/NumberInput:** min-height 44px (`h-11`), top label, muted helper/error below.
- **Select:** `h-11` (44px) — matches Input height.
- **Tabs:** segmented control; buttons are `h-10` inside a bordered `p-0.5` container (~44px overall). Active tab must be obvious.
- **SectionCard:** title + children in a `gap-2.5` stack with a `noMargin` heading; default surface + line; saved state swaps border to `--ll-saved`.
- **Modal:** `p-4` (16px) internal padding; dim backdrop + elevated surface; `max-w-[560px]`; explicit destructive copy in confirm flows.
- **StickyFooter:** anchored totals with blended sticky surface + top border.

## Component Catalog

### Atoms (19)

Button, Card, Checkbox, Field, FileInput, HelperText, Input, IntegerInput, Label, NumberInput, PageTitle, ProgressBar, Radio, SectionHeading, Select, Spinner, Text, UnitText, WarningText

### Molecules (10)

ActionRow, DateSelect3, ListRow, LoadingState, MacroSummaryLine, Modal, RadioGroup, SectionCard, StickyFooter, Tabs

### Organisms (10)

AddDayControl, AppPageHeading, AuthLanding, DailyTotalsCard, IngredientEntryCard, LabelScanCard, ListSectionCard, PageNavHeading, ProfileSectionCards, ScanReviewModal

### Templates (7)

AppShell, DayDetailTemplate, DayListTemplate, ErrorTemplate, LandingTemplate, MealEditTemplate, ProfileTemplate

## Recipes (`packages/ui/src/styles/recipes.ts`)

Reusable Tailwind class strings. Components in molecules/organisms/templates must use these tokens — do not duplicate the class strings inline.

- `focusRing` — keyboard focus ring
- `controlDisabled` — disabled control styling (reduced contrast, no-allowed cursor)
- `transition` — standard motion transition
- `radius.control` / `radius.card` / `radius.pill` — border radius tokens
- `surface.card` — card border + background
- `text.*` — typography variants (title, sectionHeading, subheading, body, meta, pageSubtitle, warn, label, tracked, missed)
- `page.shell` / `page.main` — page layout
- `stack.xs` / `stack.sm` / `stack.md` / `stack.lg` / `stack.row` / `stack.rowMd` / `stack.rowEnd` / `stack.actions` / `stack.rowBetween` / `stack.between` / `stack.center` / `stack.centerFull` — flex column/row layouts
- `grid.two` / `grid.carbFiber` / `grid.calendar7` — grid layouts
- `control.base` / `control.size` — interactive control sizing
- `button.*` — button variant colors
- `input.base` — input field styling

## State Rules

- **Default:** neutral monochrome.
- **Hover:** subtle contrast shift.
- **Active:** slight press effect.
- **Focus:** visible neutral-gray ring (`--ll-focus`) on all interactive controls.
- **Disabled:** reduced contrast, no motion.
- **Saved:** section border `--ll-saved` until next edit.
- **Warning:** text in `--ll-warn`, non-blocking.
- **Destructive:** actions in `--ll-danger`, explicit label text.

## Page Composition Rules

- **Meal Edit:** Meal Name, Ingredients, Add Flow as distinct sections.
- **Settings:** Targets, Theme, Data as distinct sections.
- **Day Detail:** Totals section first, then meals list.
- **Day List:** Add-day section first, then chronological rows.
- **Row composition:** left = label + meta, right = metric + actions.
- **Helper text:** only when action/constraint is non-obvious; max 90 chars.

## Do / Don’t

- **Do:** Keep controls quiet, spacing consistent, actions explicit.
- **Do:** Reuse UI package components before creating new local styles.
- **Don’t:** Mix ad-hoc inline styles with tokenized classes.
- **Don’t:** Introduce extra color accents without token changes.
- **Don’t:** Use raw native controls in app pages when a UI component exists.

## QA Gate

- Uses only approved spacing/radius scales.
- Uses only tokenized colors.
- Maintains 44px touch targets. Select is `h-11`; Tabs buttons are `h-10` inside a `p-0.5` container; Checkbox uses a negative-margin hit-target hack (see Documented Exceptions).
- Keeps destructive language explicit.
- Preserves mobile swipe + desktop delete parity.

## Documented Exceptions

Design decisions that intentionally deviate from the system rules above. Each exception is scoped and named — do not generalize them.

- **`PageTitle` `hero` variant:** Uses `text-5xl`/`text-6xl` (landing page only). Off the standard type scale by design; not allowed on app interior pages.
- **`UnitText` and `text.tracked` / `text.missed`:** These recipes set color and weight only; they inherit font size from their context. Do not assume a fixed size.
- **Modal `max-w-[560px]` vs page shell `max-w-[620px]`:** The narrower modal width is intentional — modal content needs less horizontal room than a full page column.
- **Modal shadow:** The modal layer is the only place a drop shadow is sanctioned. All other surfaces use border-only elevation.
- **Checkbox touch target:** Checkbox uses a `-m-3 p-3` negative-margin / padding expansion to reach the 44px touch target without adding visual bulk to the label row.

## Design Self-Review Checklist

Run through this before pushing any UI change. Items marked **[audit]** are
enforced by `pnpm design:audit` (and CI) — they will fail the build, so treat
them as a reminder of what's already automated. Items marked **[manual]** are
judgment calls the audit can't catch cheaply but the design review reliably
flags; check them by eye.

### Tokens & classes

- **[audit]** Layout uses `recipes.stack.*` / `recipes.grid.*` — never inline
  `flex …`, `gap-*`, `justify-between` literals that duplicate a token. Compose
  extra utilities with `cn(recipes.stack.row, '…')`.
- **[audit]** Typography uses the `Text`/`HelperText`/`WarningText`/`UnitText`/
  `SectionHeading` atoms — no raw `<span>/<p>/<a>` carrying text styling, in app
  pages, UI molecules/organisms/templates, **or stories**.
- **[audit]** No `.ll-*` component classes; no raw `button/input/select/textarea`
  outside atoms (or app pages).
- **[manual]** Colors, radius, and spacing come from tokens (`var(--ll-*)`, the
  10/14/999 radii plus nested-8 — see Radius Scale, the stack-gap scale and base
  4–24 scale). No one-off hex or arbitrary spacing.

### Components & structure

- **[audit]** Every new atom/molecule/organism/template ships a `.stories.tsx`.
- **[manual]** Reuse an existing atom/molecule before adding local markup. New
  shared styling belongs in `recipes.ts`, referenced — not duplicated inline.
- **[manual]** Disabled styling lives in **one** layer. Atoms already carry
  `recipes.controlDisabled` / `disabled:opacity-50`; don't also dim a wrapping
  container, or opacity stacks (e.g. dim only the label, not the whole `Field`).
- **[manual]** Prefer component props over utility classes when one exists
  (e.g. `<Button fullWidth>` over `className="w-full"`).

### Accessibility & behavior

- **[manual]** Interactive controls don't carry container-only ARIA. No
  `aria-busy` / `role="status"` on a `<button>`/`<input>` — convey loading via
  `disabled` + label text; reserve those attributes for status regions.
- **[manual]** Every input/icon-action has an accessible name (visible label or
  `aria-label`); dynamic error/status text uses `role="alert"` or `aria-live`.
- **[manual]** Touch targets stay ≥ 44×44; focus ring (`recipes.focusRing`) is
  present on all interactive controls.
- **[manual]** Mobile-first single column (375–430); macros stay in P/C/F order
  via `MacroSummaryLine`.

### When the design review still finds something

Fix the instance, then ask: _is this a class of issue?_ If a static rule can
catch it, add it to `scripts/design-system-audit.mjs` (and fix existing
violations) so it can't recur. If it's a judgment call, add it here.
