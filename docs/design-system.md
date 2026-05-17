# Leanlog Design System

## Scope

- **Role:** Implementation rules for tokens and components.
- **Source:** CSS variables from `packages/ui/src/index.css`.
- **Usage:** App pages consume UI package components and token classes only.

## Color Tokens (Monochrome + Semantics)

- `--ll-bg`: page background
- `--ll-surface`: primary surface
- `--ll-text`: primary text
- `--ll-text-muted`: secondary text
- `--ll-line`: default border/hairline
- `--ll-line-strong`: emphasized border
- `--ll-danger`: destructive action
- `--ll-warn`: warning text
- `--ll-saved`: saved-state outline

## Typography

- **Family:** `ui-sans-serif, system-ui` (single family system-wide).
- **Title:** 24/30, weight 600.
- **Section heading:** 14/20, weight 600.
- **Body:** 14/20, weight 400.
- **Meta:** 12/16, weight 500.
- **Numbers:** Use tabular numbers for totals.

## Spacing Scale

- `4, 8, 12, 16, 20, 24`
- **Containers:** default vertical rhythm uses 12 or 16.
- **Sections:** internal padding 12–16.
- **Rule:** Do not invent one-off spacing values.

## Radius Scale

- `10` (controls)
- `14` (cards/sections)
- `999` (pill actions)
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

## Component Baselines

- **Button:** min-height 44, compact horizontal padding, clear primary/ghost/danger variants.
- **Input/NumberInput:** min-height 44, top label, muted helper/error below.
- **SectionCard:** default surface + line; saved state swaps border to `--ll-saved`.
- **Modal:** dim backdrop + elevated surface; explicit destructive copy in confirm flows.
- **Tabs:** compact segmented control; active tab must be obvious.
- **SwipeRow:** mobile reveal delete; desktop shows explicit delete button.
- **StickyFooter:** anchored totals with clear separation line.

## State Rules

- **Default:** neutral monochrome.
- **Hover:** subtle contrast shift.
- **Active:** slight press effect.
- **Focus:** visible ring/outline.
- **Disabled:** reduced contrast, no motion.
- **Saved:** section border `--ll-saved` until next edit.
- **Warning:** text in `--ll-warn`, non-blocking.
- **Destructive:** actions in `--ll-danger`, explicit label text.

## Page Composition Rules

- **Meal Edit:** Meal Name, Ingredients, Add Flow as distinct sections.
- **Settings:** Targets, Theme, Data as distinct sections.
- **Day Detail:** Totals section first, then meals list.
- **Day List:** Add-day section first, then chronological rows.

## Do / Don’t

- **Do:** Keep controls quiet, spacing consistent, actions explicit.
- **Do:** Reuse UI package components before creating new local styles.
- **Don’t:** Mix ad-hoc inline styles with tokenized classes.
- **Don’t:** Introduce extra color accents without token changes.

## QA Gate

- Uses only approved spacing/radius scales.
- Uses only tokenized colors.
- Maintains 44px touch targets.
- Keeps destructive language explicit.
- Preserves mobile swipe + desktop delete parity.
