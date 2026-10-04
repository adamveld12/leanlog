import { contributesNutrition, dayConsumed, dayMealStructure } from './calculations';
import type { DailyMealLog, Meal } from './models';

// A meal counts toward the meals objective only when it actually contributes
// food (#37 R11). Two guards keep that honest:
//  - contributesNutrition: a plan-copied meal arrives pre-filled but unlogged,
//    so without this a fresh plan day would read "4/4 meals eaten" before the
//    user ate anything. Plan meals must be Logged; ad-hoc meals count on food.
//  - the Extras bucket is not a meal at all (#64 R4), even when it holds food.
export function isMeaningfulMeal(meal: Meal): boolean {
  if (meal.origin === 'extra') return false;
  if (!contributesNutrition(meal)) return false;
  return meal.ingredients.reduce((sum, i) => sum + i.calories, 0) > 0;
}

// ±10% for objectives — deliberately NOT MACRO_TOLERANCE (0.02), which governs
// strict goal adherence (#56). Calories are reported but never gate completion.
export const OBJECTIVE_MACRO_TOLERANCE = 0.1;

export type MacroState = { actual: number; target: number; complete: boolean };

// Two-sided and inclusive: overshooting fails just like undershooting. A zero
// target is never complete, so a missing target can't pass by dividing by zero.
// The epsilon absorbs float error at the boundary (e.g. 60 * 0.1).
function macroState(actual: number, target: number): MacroState {
  const complete =
    target > 0 && Math.abs(actual - target) <= target * OBJECTIVE_MACRO_TOLERANCE + 1e-9;
  return { actual, target, complete };
}

export type DayObjectives = {
  weight: { complete: boolean; weightLbs: number | null };
  meals: { complete: boolean; eaten: number; target: number };
  macros: {
    complete: boolean;
    protein: MacroState;
    carbs: MacroState;
    fat: MacroState;
    // Informational only — never part of `complete`.
    calories: MacroState;
  };
  allComplete: boolean;
};

export function dayObjectives(day: DailyMealLog): DayObjectives {
  // Target is structure-aware (plan-backed days use their copied meal count,
  // not the legacy mealCountTarget column). A zero target — an empty ad-hoc
  // day — is never complete, or "0 >= 0" would congratulate an empty day.
  const target = dayMealStructure(day).mealsExpected;
  const eaten = day.meals.filter(isMeaningfulMeal).length;
  const consumed = dayConsumed(day);

  const weight = { complete: day.weightLbs != null, weightLbs: day.weightLbs };
  const meals = { complete: target > 0 && eaten >= target, eaten, target };
  const protein = macroState(consumed.protein, day.targetProtein);
  const carbs = macroState(consumed.carbs, day.targetCarbs);
  const fat = macroState(consumed.fat, day.targetFat);
  const macros = {
    complete: protein.complete && carbs.complete && fat.complete,
    protein,
    carbs,
    fat,
    calories: macroState(consumed.calories, day.targetCalories),
  };

  return {
    weight,
    meals,
    macros,
    allComplete: weight.complete && meals.complete && macros.complete,
  };
}
