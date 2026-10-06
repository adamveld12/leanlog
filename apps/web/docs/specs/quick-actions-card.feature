Feature: Quick Actions Card

  The Quick Actions card sits below the Today's objectives card on the Day List
  page. It holds the secondary shortcuts and this week's macro progress. Today's
  progress and the "log a meal" entry point live on the objectives card
  (see today-objectives-card.feature).

  Scenario: Weekly summary is displayed
    Given the user has logged multiple days this week (Monday-Sunday)
    When the user views the day list page
    Then the Quick Actions card shows aggregated weekly consumed vs weekly targets
    And it shows how many days have been tracked this week

  Scenario: Today's progress is not duplicated here
    Given a day log exists for today
    When the user views the Quick Actions card
    Then it does not show a Today progress block
    And it does not offer a "Log a meal" button

  Scenario: Log an extra stays on the Track page
    When the user taps "Log an extra"
    Then an inline form replaces the button without navigating
    And submitting adds the extra to today, creating today first if it is missing

  Scenario: Shortcuts to the active goal and meal planning
    When the user views the Quick Actions card
    Then they can open the goal covering today
    And they can open the plans list

  Scenario: Empty state for brand-new user
    Given the user has zero day logs
    When the user views the Quick Actions card
    Then it shows hint text explaining this card will show weekly macro progress
