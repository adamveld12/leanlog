# Molecules BDD Specs

```gherkin
Feature: Leanlog Molecules

  Scenario: Molecules compose atoms
    Given a reusable component combines multiple primitive elements
    When it is implemented as a molecule
    Then it uses atoms instead of raw native controls

  Scenario: Molecules provide reusable UI patterns
    Given a developer needs a common UI pattern
    When they import from @leanlog/ui
    Then they can use ActionRow, DateSelect3, ListRow, LoadingState, MacroSummaryLine, Modal, RadioGroup, SectionCard, StickyFooter, and Tabs

  Scenario: Molecules decorate atom analytics
    Given an atom is rendered inside a molecule
    When the atom emits an analytics event
    Then the event includes molecule-level context
```
