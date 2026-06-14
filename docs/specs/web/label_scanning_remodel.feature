Feature: Label Scanning Remodel
  As a user logging a meal
  I want ingredient entry split into Manual Entry, Label Scan, and Nutrition Database tabs
  So that scanning a nutrition label is easy to find and the result pre-fills the manual form

  Background:
    Given I am signed in
    And I am on the meal edit page for a day and meal

  Scenario: Ingredient entry is organised into three tabs
    Then I see the tabs "Manual Entry", "Label Scan", and "Nutrition Facts Database"
    And the manual entry form no longer shows a "Scan Label" button next to the weight

  Scenario: Label Scan tab swaps the numeric field for servings
    When I open the "Label Scan" tab
    And I check "Check for servings"
    Then the numeric field label changes from "Weight (g or ml)" to "# of Servings"

  Scenario: Entire package ignores the numeric field
    When I open the "Label Scan" tab
    And I check "Entire package"
    Then the numeric field is disabled
    And the scan uses serving size times servings-per-container

  Scenario: Scanning with no amount assumes one serving
    When I open the "Label Scan" tab and scan a per-serving label without entering an amount
    Then the proposed values equal one serving
    And a note explains that one serving was assumed

  Scenario: Applying a scan pre-fills the Manual Entry tab
    When I scan a label and apply the reviewed values
    Then I am returned to the "Manual Entry" tab
    And the form is pre-filled with the ingredient name and the calculated weight and macros

  Scenario: A failed scan shows an error below the Scan Label button
    When a label scan fails
    Then the error message is shown centered below the "Scan Label" button

  Scenario Outline: Analytics events are emitted with day and meal context
    When <action>
    Then a "<event>" event is captured with the day id and meal id

    Examples:
      | action                                   | event                            |
      | I add an ingredient                      | meal.ingredient.added            |
      | a label scan succeeds                    | meal.ingredient.scanned          |
      | a label scan fails                       | meal.ingredient.scanned.error    |
      | I delete an ingredient                   | meal.ingredient.deleted          |
      | I open the Nutrition Database tab        | meal.ingredient.database.viewed  |
