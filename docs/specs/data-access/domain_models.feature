Feature: Domain Models & Business Logic
  As a developer
  I want validated domain models and correct calorie/macro calculations
  So that data integrity is enforced across all layers

  Rule: Calorie targets are derived from body weight

    Scenario Outline: Calorie target from mode
      Given a user weighing <weight> lbs
      When the calorie mode is "<mode>"
      Then the target calories are <calories>

      Examples:
        | weight | mode        | calories |
        | 180    | deficit     | 1800     |
        | 180    | maintenance | 2700     |
        | 180    | surplus     | 2880     |

    Scenario: Weight below minimum returns no target
      Given a user weighing 85 lbs
      When the calorie mode is "deficit"
      Then no calorie target is returned

  Rule: Macro grams are derived from percentage targets

    Scenario: Percentage macros converted to grams
      Given a calorie target of 2700
      When macro percentages are 25% fat, 35% carbs, 40% protein
      Then fat is 75g, carbs are 236g, protein is 270g
