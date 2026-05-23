# Atoms BDD Specs

```gherkin
Feature: Leanlog Atoms

  Scenario: Atoms provide base UI primitives
    Given a developer needs a primitive UI element
    When they import from @leanlog/ui
    Then they can use Button, Card, Field, Input, NumberInput, ProgressBar, Select, Text, and color documentation

  Scenario: Atoms may wrap native controls
    Given an atom represents a primitive interactive element
    When it renders
    Then it may render native button, input, select, textarea, or label elements
    And it applies Leanlog design tokens and accessibility behavior

  Scenario: Atoms emit analytics events
    Given analytics tracking is enabled
    When a user interacts with an atom
    Then the atom emits an analytics event
    And the event includes relevant atom values
```
