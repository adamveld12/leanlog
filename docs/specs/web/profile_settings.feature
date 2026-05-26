Feature: Profile Settings Independence
  As a user editing my profile
  I want each settings section to save independently
  So that changing one setting never resets another

  Background:
    Given I am signed in
    And I have a profile with weightLbs 200 and heightInches 68

  Scenario: Changing macro mode preserves body info
    When I change macroMode to "custom"
    Then my weightLbs should be 200
    And my heightInches should be 68

  Scenario: Changing weight preserves macro settings
    Given my profile has macroFats 30, macroCarbs 40, macroProtein 30
    When I change weightLbs to 190
    Then my macroFats should be 30
    And my macroCarbs should be 40
    And my macroProtein should be 30

  Scenario: Changing calorie mode preserves all other fields
    When I change calorieMode to "deficit"
    Then my weightLbs should be 200
    And my heightInches should be 68

  Scenario: Multiple sequential edits across sections persist
    When I change weightLbs to 190
    And I change macroMode to "custom"
    And I change macroFats to 30
    Then my profile should have weightLbs 190, macroMode "custom", macroFats 30

  Scenario: Partial update schema outputs only provided fields
    Given a partial update input with only macroMode "custom"
    When the UpdateProfileSchema parses it
    Then the output should contain only macroMode
    And no default values should be present
