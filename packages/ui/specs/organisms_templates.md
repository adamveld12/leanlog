# Organisms and Templates BDD Specs

```gherkin
Feature: Organisms and Templates

  Scenario: Organisms compose molecules and atoms
    Given a component represents a distinct interface section
    When it is implemented as an organism
    Then it uses molecules and atoms instead of raw native controls

  Scenario: Templates compose organisms into page layouts
    Given a reusable screen layout is needed
    When it is implemented as a template
    Then it receives data and callbacks as props
    And it composes organisms, molecules, and atoms

  Scenario: Templates do not own app concerns
    Given a template renders a screen layout
    When it needs navigation, persistence, authentication, or route params
    Then those concerns are supplied by an app page
```
