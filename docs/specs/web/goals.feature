Feature: Goals target planning (#56)
  As a Leanlog user
  I want goals to define my targets over time
  So that I can execute each day from the right plan without using Profile settings

  Background:
    Given the user is signed in
    And a background maintenance goal exists with no start or end date
    And its meal slots are "Breakfast", "Lunch", "Dinner", and "Snack"

  Rule: Goals replace Profile and Settings as the target authority

    Scenario: Primary navigation
      When the user opens the app navigation
      Then the primary links are "Execute" and "Goals"
      And "Execute" opens the day list calendar command center
      And a light/dark theme toggle sits next to the Clerk user control
      And no Profile, Meal Templates, or export/import surface is available

  Rule: Background maintenance supplies fallback targets

    Scenario: No user goal covers a day
      Given no user-created goal covers today
      And the latest logged weight on or before today is 190 lb
      When Leanlog derives today's targets
      Then the background maintenance goal is used at 15x and target weight 190 lb
      And with no logged weight the target weight is 180 lb

  Rule: Targets derive from goal mode and latest known weight

    Scenario: Cut calories from weight on or before the day
      Given a Cut goal covers the day and the latest weight on/before is 200 lb
      When targets derive with delta 0
      Then calories are 2000 and macro grams come from the goal percentages

  Rule: Active calorie delta recalculates today and forward only

    Scenario: Delta change
      When the user sets an active goal's calorie delta to -150
      Then today and future covered days drop 150 kcal
      And past covered days are unchanged

  Rule: Goal dates are inclusive, future-start, non-overlapping, max two future

    Scenario: Early-start offers a warned trim
      Given an active goal runs through 2026-07-31
      When the user creates a goal starting 2026-07-01
      Then the UI warns the active goal will end 2026-06-30 before saving
    Scenario: Overlap and limits
      Then overlapping goals are rejected
      And a third future user goal is blocked

  Rule: Editability follows lifecycle

    Scenario: Lifecycle gating
      Then future and today-started goals are fully editable and deletable
      And an active older goal allows only name, description, end date, and calorie delta
      And past goals are read-only summary rows

  Rule: New day logs inherit the covering goal's meal slots

    Scenario: Day creation
      When the user creates a new day
      Then it gets one meal per covering-goal slot with the slot's default ingredients
      And editing a future goal's slots affects only newly created days

  Rule: Daily adherence and completed-goal outcomes

    Scenario: Adherence
      Then a day passes only when meal count, calories (±5%), and every macro (±2%) pass
      And empty or missing-value days fail
      And the calendar shows a green check or red X per tracked day
    Scenario: Goal outcome
      Then a completed Cut goal is reached at or below target+2% by final in-window weight
      And a completed goal with no in-window weight is missed
      And generated maintenance segments receive no outcome
