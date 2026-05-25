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

  Scenario: Storybook documents templates, not app pages
    Given Storybook loads Leanlog UI examples
    When route-level app pages exist in apps/web/src/pages
    Then those app pages are not included in Storybook
    And reusable UI templates from packages/ui/src/templates are documented instead
```
