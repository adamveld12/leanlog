import type { Ingredient, Meal, DailyMealLog } from '@leanlog/data-access';
import { sum } from './lib';

export function ingredientTotals(items: Ingredient[]) {
  return {
    calories: sum(items.map((i) => i.calories)),
    fat: sum(items.map((i) => i.fat)),
    saturatedFat: sum(items.map((i) => i.saturatedFat)),
    carbs: sum(items.map((i) => i.carbs)),
    fiber: sum(items.map((i) => i.fiber)),
    protein: sum(items.map((i) => i.protein)),
  };
}

export function mealTotals(meal: Meal) {
  return ingredientTotals(meal.ingredients);
}

export function dayTotals(day: DailyMealLog) {
  return ingredientTotals(day.meals.flatMap((m) => m.ingredients));
}
