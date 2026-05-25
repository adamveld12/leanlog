Feature: Data Export
  As a signed-in user
  I want to export my data as a JSON file
  So that I have a backup of my nutrition tracking history

  Background:
    Given the user is signed in

  Scenario: User exports their data
    Given the user has daily meal logs with meals and ingredients
    When the user clicks Export on the Profile page
    Then a JSON file containing all their data is downloaded
