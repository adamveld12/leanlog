Feature: Quick Actions Card

  The Quick Actions card is the first section on the Day List page.
  It provides a single CTA to start tracking and shows today's and
  this week's macro progress at a glance.

  Scenario: Today's macro progress is displayed
    Given the user has a profile with calorie/macro targets
    And a day log exists for today with meals logged
    When the user views the day list page
    Then they see a Quick Actions SectionCard
    And it shows today's consumed vs target for calories with a progress bar
    And it shows protein, carbs, and fat consumed vs target

  Scenario: Weekly summary is displayed
    Given the user has logged multiple days this week (Monday-Sunday)
    When the user views the day list page
    Then the Quick Actions card shows aggregated weekly consumed vs weekly targets
    And it shows how many days have been tracked this week

  Scenario: Add Meal CTA when today has no entry
    Given no day entry exists for today
    When the user views the day list page
    Then the button reads "Start Today"
    And today's macro progress shows "No entry for today" in muted text

  Scenario: Tapping "Start Today" creates today and navigates to day detail
    Given no day entry exists for today
    When the user taps "Start Today"
    Then a day entry is created for today using profile defaults
    And the user is navigated to the day detail page for today
    And no meal is auto-created

  Scenario: Tapping "Add Meal" when today already exists
    Given a day entry already exists for today
    When the user taps "Add Meal"
    Then the user is navigated to the day detail page for today

  Scenario: Empty state for brand-new user
    Given the user has zero day logs
    When the user views the Quick Actions card
    Then it shows onboarding hint text explaining this card will show daily and weekly macro progress
    And the "Start Today" button is prominently displayed
