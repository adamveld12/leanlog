# Leanlog Design Reference

## Purpose

- **Role:** Product-level UI/UX rules for Leanlog.
- **Scope:** Behavior, hierarchy, interaction, readability.
- **Source priority:** If design conflicts anywhere else, this file wins.

## Product Tone

- **Style:** Black-and-white minimalist.
- **Feel:** Quiet, deliberate, premium utility.
- **Bias:** Less decoration, more clarity.
- **Rule:** Every element must justify its existence.

## UX Principles

- **Fast:** Core actions complete in 1–2 taps.
- **Predictable:** Same action style means same outcome everywhere.
- **Low-friction:** Defaults are sensible; forms avoid unnecessary steps.
- **Forgiving:** Destructive actions require explicit confirmation.

## Layout Principles

- **Mobile-first:** Optimize 375–430 widths first.
- **Single column:** One primary reading/action column.
- **Desktop behavior:** Centered container with generous side whitespace.
- **Touch:** Interactive hit areas are at least 44x44.

## Information Hierarchy

- **Level 1:** Date / page context.
- **Level 2:** Totals and primary metrics.
- **Level 3:** Editable detail rows.
- **Level 4:** Meta/supporting labels.
- **Rule:** Never let helper text visually compete with totals.

## Interaction Rules

- **Live-save:** Save on change; no submit button for routine edits.
- **Saved feedback:** Section border indicates saved state until next edit.
- **Warnings:** Inline, non-blocking for macro consistency checks.
- **Destructive copy:** Explicit and specific about what gets deleted.

## Form Rules

- **Label placement:** Above input.
- **Numeric behavior:** Free typing precision, round to 1 decimal on blur.
- **Ingredient naming:** Uppercase while typing and on save.
- **Validation style:** Informative first, blocking only when truly required.

## List/Row Behavior

- **Mobile:** Swipe left reveals delete action.
- **Desktop:** Delete button always visible.
- **Density:** Rows stay airy; avoid cramped controls.
- **Tap target:** Row-primary action remains easy to hit.

## State Design

- **Empty states:** Explain next action clearly.
- **Error states:** Short, plain-language, inline where issue occurs.
- **Loading:** Subtle skeleton or quiet placeholder; avoid spinner-heavy UI.
- **Success:** Use restrained confirmation, not celebratory animation.

## Motion Principles

- **Motion style:** Restrained, purposeful.
- **Allowed:** Opacity + transform transitions.
- **Avoid:** Decorative motion and noisy perpetual animations.
- **Timing:** Quick enough to feel responsive, smooth enough to feel premium.

## Accessibility Baseline

- **Contrast:** Text and controls must remain high-contrast in both themes.
- **Focus:** Visible keyboard focus on all actionable elements.
- **Labels:** Inputs and icon actions require clear accessible naming.
- **Consistency:** Same component state language across all pages.

## Anti-Patterns

- No novelty UI that slows logging.
- No over-colored surfaces.
- No ambiguous destructive actions.
- No inconsistent spacing/radius/font scales.

## Review Checklist

- Is the action path fast?
- Is hierarchy obvious at first glance?
- Is text concise and concrete?
- Is destructive intent explicit?
- Is behavior consistent on mobile and desktop?
