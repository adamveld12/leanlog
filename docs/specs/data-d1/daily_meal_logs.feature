Feature: Daily Meal Log Persistence
  As a signed-in user
  I want my daily meal logs stored in the database
  So that my tracking data persists across devices

  Background:
    Given the user is authenticated

  Rule: API authentication is enforced

    Scenario: Authenticated user accesses their data
      Given the user has a valid session token
      When the user requests their daily meal logs
      Then the API returns only their data

    Scenario: Unauthenticated request is rejected
      Given a request has no valid session token
      When the request reaches any API endpoint
      Then the API responds with 401 Unauthorized

  Rule: Daily meal logs are managed via API

    Scenario: User creates a new day
      Given the user has no log for "2026-05-25"
      When the user creates a daily meal log for "2026-05-25" with calorie target 2700
      Then a new daily meal log exists for "2026-05-25"
        And the log has calorie target 2700

    Scenario: Duplicate day date is rejected
      Given the user already has a log for "2026-05-25"
      When the user creates another daily meal log for "2026-05-25"
      Then the API responds with 409 Conflict

    Scenario: User deletes a day and cascade removes children
      Given the user has a daily meal log with 2 meals and 5 ingredients
      When the user deletes that daily meal log
      Then the daily meal log, all its meals, and all ingredients are removed

  Rule: Meals and ingredients are managed within a day

    Scenario: User adds a meal to a day
      Given the user has a daily meal log for today
      When the user adds a meal named "LUNCH"
      Then the meal "LUNCH" appears in that day's meal list

    Scenario: User upserts an ingredient
      Given a meal "LUNCH" exists in today's log
      When the user adds ingredient "CHICKEN BREAST" with 165 calories and 31g protein
      Then "CHICKEN BREAST" appears in "LUNCH" with the correct nutrition values
