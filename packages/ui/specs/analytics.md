# Analytics BDD Specs

```gherkin
Feature: UI Analytics

  Scenario: Development analytics logs to the browser console
    Given the app runs in development
    When a UI analytics event fires
    Then the default analytics implementation logs the event with console.info

  Scenario: Atom events include values
    Given a user changes an atom value
    When the atom emits analytics
    Then the event includes the relevant value

  Scenario: Higher layers decorate atom analytics
    Given an atom is nested inside a molecule, organism, template, and app page
    When the atom emits analytics
    Then the event includes context from each enclosing layer
```
