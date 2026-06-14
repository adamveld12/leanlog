Feature: Nutrition Facts Database
  As a user logging meals
  I want to save nutrition labels (per-serving facts + metric serving size + servings per package)
  So that I can scale a saved label into a meal by weight, servings, or the entire package

  Background:
    Given I am signed in
    And I am editing a meal on the meal edit page
    And the ingredient editor shows a "Nutrition Facts Database" tab

  Scenario: The database tab captures a full nutrition label
    When I open the "Nutrition Facts Database" tab
    And I add a database ingredient with a name, metric serving size and unit, servings per package, calories, fat, carbs, and protein
    Then "Publish" is enabled and saving stores the label

  Scenario: An impossible label is blocked
    Given a label whose saturated fat exceeds total fat
    Then "Publish" is disabled with a contradiction message
    And no unsaturated fat is derived

  Scenario: Servings per package is required to save
    Given a label with calories and macros but no servings per package
    Then "Publish" is disabled and servings per package is listed as required

  Scenario: The database scan is stricter than the meal scan
    When I scan a label from the "Scan a label" button on the database tab
    And servings per package or calories cannot be read
    Then the staged label is not save-ready and the missing fields are visible

  Scenario: Explicit save only
    When I apply a meal label scan to a meal without choosing to save
    Then no label is created in the Nutrition Facts Database

  Scenario Outline: Adding a saved label to a meal by mode
    Given a saved label in my search results
    When I choose to add it by "<mode>"
    Then the created ingredient stores a scaled snapshot and a reference to the source label

    Examples:
      | mode           |
      | Weight         |
      | Servings       |
      | Entire package |

  Scenario: Entire package hides the amount input
    Given a saved label in my search results
    When I choose to add it by "Entire package"
    Then no amount input is shown and Add is enabled

  Scenario: Micronutrients are typed and percent daily value is discarded
    When I save a label listing sodium and cholesterol with percent daily value
    Then they persist with typed units and percent daily value is not stored

  Scenario: Manual meal ingredient entry is unchanged
    When I open the "Manual Entry" tab for a meal ingredient
    Then there are no serving-size or servings-per-package inputs
