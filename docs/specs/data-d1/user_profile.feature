Feature: User Profile Persistence
  As a signed-in user
  I want my profile stored in the database
  So that my targets and preferences sync across devices

  Background:
    Given the user is authenticated

  Scenario: Profile is auto-created on first access
    Given the user has no profile in the database
    When the user accesses their profile
    Then a default profile is created with their Clerk user ID

  Scenario: Profile updates are saved
    Given the user has a profile
    When the user sets goal weight to 175 lbs and protein target to 180g
    Then the profile reflects the updated goal weight and protein target
