import type { Ingredient, Micronutrient } from '@leanlog/data-access';
import { parseMicronutrientsJson } from '@leanlog/data-access';
import type { ingredients } from '../schema';

// Maps a stored ingredient row to its domain shape. Every repository that
// returns ingredients must go through this: a raw drizzle row carries
// `micronutrientsJson`, not `micronutrients`, so spreading it straight into a
// Meal silently drops the typed nutrient amounts on the way to the client (#93).
export function rowToIngredient(row: typeof ingredients.$inferSelect): Ingredient {
  return {
    id: row.id,
    mealId: row.mealId,
    name: row.name,
    weight: row.weight,
    calories: row.calories,
    fat: row.fat,
    saturatedFat: row.saturatedFat,
    carbs: row.carbs,
    fiber: row.fiber,
    protein: row.protein,
    unsaturatedFat: row.unsaturatedFat ?? null,
    monounsaturatedFat: row.monounsaturatedFat ?? null,
    polyunsaturatedFat: row.polyunsaturatedFat ?? null,
    transFat: row.transFat ?? null,
    sugar: row.sugar ?? null,
    sugarAlcohol: row.sugarAlcohol ?? null,
    allulose: row.allulose ?? null,
    alcohol: row.alcohol ?? null,
    calorieSource: row.calorieSource,
    estimatedCalories: row.estimatedCalories,
    micronutrients: parseMicronutrientsJson(row.micronutrientsJson),
    sourceDatabaseIngredientId: row.sourceDatabaseIngredientId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function serializeMicronutrients(
  micronutrients: Micronutrient[] | null | undefined,
): string | null {
  if (micronutrients == null) return null;
  return JSON.stringify(micronutrients);
}
