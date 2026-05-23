# Design System BDD Specs

```gherkin
Feature: Leanlog Atomic Design System

  Scenario: UI components are organized by Atomic Design layer
    Given the UI package contains reusable design-system components
    When a developer browses the source tree
    Then atoms live in packages/ui/src/atoms
    And molecules live in packages/ui/src/molecules
    And organisms live in packages/ui/src/organisms
    And templates live in packages/ui/src/templates

  Scenario: Application pages live in the app
    Given a route-level page is implemented
    When it owns routing, app state, persistence, or product-specific handlers
    Then it lives in apps/web/src/pages
    And it consumes templates from packages/ui

  Scenario: Templates stay in the UI package
    Given a reusable page layout is implemented
    When it receives data and callbacks as props
    Then it lives in packages/ui/src/templates
    And it does not read app routes, app state, localStorage, or Clerk directly

  Scenario: Components use raw Tailwind utility styling
    Given an atom, molecule, organism, or template is implemented
    When styles are authored
    Then the component uses Tailwind utility classes with Leanlog CSS variables
    And no legacy ll-* component classes are used

  Scenario: Storybook reflects Atomic Design layers
    Given components are documented in Storybook
    When Storybook loads
    Then atoms appear under "Design System/Atoms"
    And molecules appear under "Design System/Molecules"
    And organisms appear under "Design System/Organisms"
    And templates appear under "Design System/Templates"
```
