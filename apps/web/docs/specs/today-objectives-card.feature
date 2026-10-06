Feature: Today's objectives card

  The Day List leads with a card that tells the user what they can do right now
  to stay on track today: log weight, eat the target number of meaningful meals,
  and land protein, carbs, and fat within 10 percent of target. It only ever
  represents today; historical days are for review, not action.

  Per-meal macro targets and in-page eat reminders are deferred to follow-up
  work on #37 and are not covered here.

  Background:
    Given today has protein, carbs, fat, and calorie targets
    And today has a target meal count

  Rule: The card is today-only

    Scenario: Objectives lead the Day List
      When the user views the Day List page
      Then the first card shows weight, meal, and macro objectives
      And each objective reads completed with a green check or incomplete with a red x

    Scenario: Yesterday never completes today's objectives
      Given yesterday has a logged weight
      And today has no logged weight
      When the user views the Day List page
      Then the weight objective is incomplete

    Scenario: The card appears before today's day exists
      Given no day has been created for today
      When the user views the Day List page
      Then every objective is incomplete
      And no day is created until the user acts

  Rule: Weight is the first objective

    Scenario: Weight is incomplete with guidance and a call to action
      Given today has no logged weight
      Then the weight objective is incomplete
      And the user is told to weigh immediately upon waking, after peeing, before eating or drinking, and ideally naked
      And a "Log today's weight" action opens today's day

    Scenario: Logging weight completes the objective
      When the user logs 182.5 lbs
      Then the weight objective is complete and shows 182.5 lbs
      And the weight action is no longer offered
      And "day.objectives.completed.weight_logged" is captured with the day id, date, and value 182.5

    Scenario: The Day page collapses the weight editor once logged
      Given today has a logged weight
      When the user views the Day page
      Then weight shows as a compact label with an Edit action
      And the weight input is not shown

  Rule: A meal counts only when it has food

    Scenario: An empty meal does not advance progress
      Given today's target is 4 meals
      When the user creates a meal with no ingredients
      Then meal progress stays at 0 of 4
      And no meal-eaten event is captured

    Scenario: A meal with calories advances progress
      When an ingredient with non-zero calories is added to that meal
      Then meal progress is 1 of 4
      And "day.objectives.completed.meal_eaten" is captured with the meal id, value 1, and total 4

    Scenario: A pre-filled plan meal counts only once logged
      Given a plan-copied meal arrives with the plan's ingredients but is not logged
      Then it does not count toward meal progress

    Scenario: Extras are not meals
      When the user logs an extra
      Then meal progress is unchanged
      But the extra's macros still count toward the macro objective

    Scenario: Re-adding a meal's food is not captured twice
      Given a meal was already reported as eaten
      When its food is removed and added back
      Then no second meal-eaten event is captured

  Rule: The next-meal action goes where the user can act

    Scenario: Continue the first meal without food
      Given today has meals where the second has no food
      When the user taps the next-meal action
      Then that meal's editor opens

    Scenario: Start a new meal when every meal has food
      When the user taps the next-meal action
      Then a new meal is created and its editor opens

    Scenario: A pre-filled plan meal is logged from the Day page
      Given the next meal is a pre-filled plan meal
      When the user taps the next-meal action
      Then the Day page opens, where that meal can be logged

    Scenario: The Day page leads with the next meal once weight is logged
      Given today's day is backed by a plan
      When weight is logged
      Then the first plan meal without food is offered as the primary action
      And before weight is logged the same action is secondary

  Rule: Macros are judged within 10 percent, both directions

    Scenario: Protein, carbs, and fat each within 10 percent complete the macros
      Given today's targets are 150g protein, 200g carbs, and 60g fat
      When the user has logged 165g, 180g, and 54g
      Then the macro objective is complete

    Scenario: Overshooting fails just like undershooting
      When the user has logged 250g protein against a 150g target
      Then the macro objective is incomplete

    Scenario: Calories never gate completion
      Given weight, meals, and the three macros are complete
      But calories are far outside target
      Then every objective is complete

  Rule: Completion is durable and reported once

    Scenario: All objectives complete
      Given weight, the target meal count, and all three macros are complete
      Then the user is congratulated with the time they finished
      And the day's first-completion timestamp is set by the server
      And "day.objectives.completed" is captured with the day id and date

    Scenario: The timestamp is never cleared or re-reported
      Given today already has a first-completion timestamp
      When the user edits a meal so fat leaves the 10 percent range
      Then the timestamp remains set
      And no completion event is captured again

    Scenario: The server declines to stamp an incomplete day
      Given a stale client asks to complete a day that is not complete
      Then the server leaves the timestamp unset

    Scenario: A failed stamp never blocks the user
      Given the completion request fails
      Then the failure is reported to error tracking
      And the user's edit is unaffected
      And the next qualifying edit retries
