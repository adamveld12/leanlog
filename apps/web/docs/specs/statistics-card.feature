Feature: Statistics Card

  The Statistics card shows macro accuracy, tracking coverage, and
  estimated weight loss. It has two tabs: Weekly (current ISO Mon-Sun
  week) and Overall (rolling 90-day window).

  Scenario: Weekly tab shows current ISO week stats
    Given the user has tracked days in the current Monday-Sunday week
    When the user views the Statistics card with "Weekly" tab selected
    Then macro accuracy, coverage, and estimated weight lost reflect only this week's data

  Scenario: Overall tab shows rolling 90-day stats
    Given the user has tracked days over the past 90 days
    When the user taps the "Overall" tab
    Then all statistics update to reflect the rolling 90-day window

  Scenario: Macro accuracy penalizes overshoot symmetrically
    Given a user has a calorie target of 2000
    And they consumed 2400 calories (20% over)
    Then calorie accuracy is 80%
    And a user who consumed 1600 calories (20% under) also shows 80%

  Scenario: Macro accuracy shows per-macro breakdown
    When the user views the Statistics card
    Then it shows individual accuracy for protein, carbs, fat, and calories
    And an overall aggregate accuracy score

  Scenario: Tracking coverage calculation
    Given a user targets 4 meals per day and tracked 3 on a given day
    When the user views the Statistics card
    Then tracking coverage shows the percentage of meals tracked vs expected

  Scenario: Estimated weight lost with certainty
    Given the user's maintenance calories are known
    And the user has a calorie deficit across tracked days
    When the user views the Statistics card
    Then estimated weight lost is shown in pounds (deficit / 3000)
    And a certainty percentage is shown capped at 80%

  Scenario: Low certainty warning
    Given the user's tracking coverage results in certainty below 75%
    When the user views the Statistics card
    Then red warning text says "Track more consistently to get this number up!"

  Scenario: Empty state for brand-new user
    Given the user has zero day logs
    When the user views the Statistics card
    Then it shows onboarding hint text explaining what accuracy, coverage, and weight loss tracking mean
    And all values show as "--" or 0
