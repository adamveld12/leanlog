# App Pages BDD Specs

```gherkin
Feature: App Pages

  Scenario: Route pages live in apps/web
    Given a screen is tied to a route
    When it reads route params, app state, Clerk state, or localStorage-backed data
    Then it lives in apps/web/src/pages

  Scenario: App pages consume UI templates
    Given an app page renders a Leanlog screen
    When it prepares data and handlers
    Then it passes them to a template from @leanlog/ui

  Scenario: App pages do not create local design-system controls
    Given an app page needs buttons, inputs, cards, rows, modals, or tabs
    When it renders UI
    Then it uses @leanlog/ui components
    And it does not render raw native controls directly

  Scenario: Interactive content is wrapped in a card, not floated between cards
    Given an app composition renders a section or tab panel
    When it places interactive content such as a scan, add, or submit action
    Then that content lives inside a SectionCard or card organism
    And no control atom is rendered as a bare sibling of a card

  Scenario: Storybook documents templates, not app pages
    Given Storybook loads Leanlog UI examples
    When route-level app pages exist in apps/web/src/pages
    Then those app pages are not included in Storybook
    And reusable UI templates from packages/ui/src/templates are documented instead
```
