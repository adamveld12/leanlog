Feature: Nutrition Facts Database management page
  As a user who saves nutrition labels
  I want a dedicated page to browse, search, scan, create, edit, and delete my labels
  So that I can manage my saved labels without being in the middle of logging a meal

  Background:
    Given I am signed in

  Scenario: Reach the database from the global header
    When I click the "Nutrition Facts" link in the header
    Then I land on the Nutrition Facts Database page

  Scenario: Browse all saved labels on load
    Given the database has saved labels
    When the page loads with an empty search
    Then I see the most recent labels without typing a query
    And I can load more when the catalog has additional pages

  Scenario: Empty, loading, and error states
    Given the database has no labels
    Then I see an empty-state message
    And while labels load I see a loading state
    And if loading fails I see an error message

  Scenario: Search the catalog
    When I type a query of at least 2 characters
    Then the list filters to matching labels after a short debounce
    And clearing the query restores the browse list

  Scenario: Manually create a label
    When I click "Add an ingredient" and fill the full label form
    Then saving creates the label and it appears at the top of the list

  Scenario: Scan a new label
    When I click "Scan to add" and capture a readable label
    Then the staged values pre-fill the label form for review
    And missing required fields keep save blocked until corrected

  Scenario: Edit a label I added
    Given a label I added
    When I click "Edit", change a field, and save
    Then the label is updated in place
    And the immutable creation source is not changed

  Scenario: Delete a label I added
    Given a label I added
    When I click "Delete" and confirm in the dialog
    Then the label is removed from the list

  Scenario: Cannot manage another user's label
    Given a label that was added by another user
    Then I see no Edit or Delete actions for it
    And the update and delete endpoints reject the attempt with 403
