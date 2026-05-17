import type { Day, Ingredient, Meal } from './types';
import { sum } from './lib';

export const ingredientTotals = (items: Ingredient[]) => ({
  calories: sum(items.map((i) => i.calories)),
  fat: sum(items.map((i) => i.fat)),
  saturatedFat: sum(items.map((i) => i.saturatedFat)),
  carbs: sum(items.map((i) => i.carbs)),
  fiber: sum(items.map((i) => i.fiber)),
  protein: sum(items.map((i) => i.protein)),
});

export const mealTotals = (meal: Meal) => ingredientTotals(meal.ingredients);

export const dayTotals = (day: Day) => ingredientTotals(day.meals.flatMap((m) => m.ingredients));
