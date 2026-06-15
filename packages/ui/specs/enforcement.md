# Enforcement BDD Specs

```gherkin
Feature: Design System Enforcement

  Scenario: Raw controls are blocked outside atoms
    Given a developer adds a raw button, input, select, textarea, radio input, file input, integer input, or label outside atoms
    When lint runs
    Then the check fails with guidance to use @leanlog/ui atoms

  Scenario: Legacy ll-* classes are blocked
    Given a developer uses an ll-* component class
    When lint or design audit runs
    Then the check fails

  Scenario: UI package class names are recipe-approved
    Given a component is implemented in packages/ui
    When it uses reusable class strings
    Then those class strings are imported from packages/ui/src/styles/recipes.ts
    And no ad-hoc named component classes are used

  Scenario: App pages are exempt from recipe class enforcement
    Given a route page is implemented in apps/web/src/pages
    When lint and design audit run
    Then the page is checked for Atomic Design boundaries and raw control usage
    But it is not checked against the packages/ui recipes.ts class-name allowlist

  Scenario: Tab-panel content lives in cards
    Given a tab panel (role="tabpanel") in an app composition file
    When it renders interactive content
    Then that content lives inside a SectionCard or card organism
    And a control atom (Button, Input, Select, NumberInput, Checkbox, Radio, FileInput) is never a bare sibling of a card in the panel
    And the design audit fails when a control floats outside a card in a tab panel

  Scenario: Claude provides advisory design review
    Given a pull request changes frontend or UI files
    When the Claude design review workflow runs
    Then Claude comments with advisory feedback about Atomic Design and Leanlog design-system compliance
```
