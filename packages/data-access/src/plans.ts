import type { PlanMealIngredient } from './models';

// A plan meal, reduced to what materialization needs to act on.
export type MaterializePlanMeal = {
  name: string;
  ingredients: PlanMealIngredient[];
};

// A day's existing meal, reduced to what materialization needs to act on.
export type MaterializeDayMeal = {
  id: string;
  name: string;
  logged: boolean;
  ingredientCount: number;
};

export type MaterializeAction =
  | { kind: 'fill'; mealId: string; ingredients: PlanMealIngredient[] }
  | { kind: 'append'; name: string; ingredients: PlanMealIngredient[] }
  | { kind: 'skip'; mealId: string; reason: 'has_food' | 'logged' };

// The one rule behind both day creation and explicit plan application
// (#84 R19-R25, R29): fill meals that are empty and unlogged, skip everything
// else, append unmatched. Day creation is the degenerate case where
// `dayMeals` is empty, so every plan meal appends.
export function planMaterialization(
  planMeals: MaterializePlanMeal[],
  dayMeals: MaterializeDayMeal[],
): MaterializeAction[] {
  const key = (name: string) => name.trim().toLowerCase();
  const consumed = new Set<string>();
  return planMeals.map((planMeal): MaterializeAction => {
    // First unconsumed name match, so two plan meals sharing a name don't both
    // target the same day meal.
    const match = dayMeals.find(
      (dayMeal) => !consumed.has(dayMeal.id) && key(dayMeal.name) === key(planMeal.name),
    );
    if (!match) return { kind: 'append', name: planMeal.name, ingredients: planMeal.ingredients };
    consumed.add(match.id);
    if (match.logged) return { kind: 'skip', mealId: match.id, reason: 'logged' };
    if (match.ingredientCount > 0) return { kind: 'skip', mealId: match.id, reason: 'has_food' };
    return { kind: 'fill', mealId: match.id, ingredients: planMeal.ingredients };
  });
}

// Replaces both DEFAULT_MEAL_TEMPLATE_NAMES and DEFAULT_MEAL_SLOTS — the four
// meals a day (or goal) gets when it has no plan to materialize from (R30).
export const DEFAULT_MEAL_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
