Feature: Month Calendar Card

  The Month Calendar card shows the current month as a grid with
  ISO week order (Mon-Su). It replaces the old day list as the
  primary way to navigate to individual day entries.

  Scenario: Calendar shows tracked and untracked days
    Given the user has logged entries for specific days this month
    When the user views the Calendar card
    Then days with logged entries show a green checkmark
    And past days without entries show a red X
    And future days show only the day number with no indicator
    And today shows the day number with a subtle ring

  Scenario: Tapping a tracked day navigates to day detail
    Given a day with entries exists
    When the user taps that day's green checkmark
    Then the app navigates to the Day Detail page for that entry

  Scenario: Tapping an untracked day does nothing
    Given a past day has no entry (red X)
    When the user taps that day
    Then nothing happens

  Scenario: Current month only - no navigation
    When the user views the Calendar card
    Then only the current month is displayed
    And there are no previous/next month navigation controls

  Scenario: Calendar uses ISO week order
    When the user views the Calendar card
    Then the day header row reads "Mo Tu We Th Fr Sa Su"

  Scenario: Empty state for brand-new user
    Given the user has zero day logs
    When the user views the Calendar card
    Then all past days show red X indicators
    And today shows with a subtle ring and no indicator
    And hint text below the calendar encourages the user to start tracking
