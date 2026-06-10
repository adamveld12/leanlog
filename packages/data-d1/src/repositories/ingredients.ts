import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { ingredients, meals, dailyMealLogs } from '../schema';
import { caloriesFromMacros } from '@leanlog/data-access';
import type {
  IngredientRepository,
  Ingredient,
  UpsertIngredient,
  Micronutrient,
} from '@leanlog/data-access';

function serializeMicronutrients(
  micronutrients: Micronutrient[] | null | undefined,
): string | null {
  if (micronutrients == null) return null;
  return JSON.stringify(micronutrients);
}

function deserializeMicronutrients(json: string | null | undefined): Micronutrient[] | null {
  if (json == null) return null;
  return JSON.parse(json) as Micronutrient[];
}

function rowToDomain(row: typeof ingredients.$inferSelect): Ingredient {
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
    micronutrients: deserializeMicronutrients(row.micronutrientsJson),
    sourceDatabaseIngredientId: row.sourceDatabaseIngredientId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createIngredientRepository(db: D1Database): IngredientRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  return {
    async upsert(userId, mealId, data: UpsertIngredient) {
      // Verify ownership: the target meal must belong to the user
      const ownerRows = await d
        .select({ mealId: meals.id, userId: dailyMealLogs.userId })
        .from(meals)
        .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
        .where(eq(meals.id, mealId));
      if (!ownerRows[0] || ownerRows[0].userId !== userId) return null;

      const ts = now();
      const calories = caloriesFromMacros({
        fat: data.fat,
        carbs: data.carbs,
        protein: data.protein,
        fiber: data.fiber,
      });

      await d
        .insert(ingredients)
        .values({
          id: data.id,
          mealId: data.mealId,
          name: data.name,
          weight: data.weight,
          calories,
          fat: data.fat,
          saturatedFat: data.saturatedFat,
          carbs: data.carbs,
          fiber: data.fiber,
          protein: data.protein,
          unsaturatedFat: data.unsaturatedFat ?? null,
          monounsaturatedFat: data.monounsaturatedFat ?? null,
          polyunsaturatedFat: data.polyunsaturatedFat ?? null,
          transFat: data.transFat ?? null,
          sugar: data.sugar ?? null,
          micronutrientsJson: serializeMicronutrients(data.micronutrients ?? null),
          sourceDatabaseIngredientId: data.sourceDatabaseIngredientId ?? null,
          createdAt: ts,
          updatedAt: ts,
        })
        .onConflictDoUpdate({
          target: ingredients.id,
          set: {
            name: data.name,
            weight: data.weight,
            calories,
            fat: data.fat,
            saturatedFat: data.saturatedFat,
            carbs: data.carbs,
            fiber: data.fiber,
            protein: data.protein,
            unsaturatedFat: data.unsaturatedFat ?? null,
            monounsaturatedFat: data.monounsaturatedFat ?? null,
            polyunsaturatedFat: data.polyunsaturatedFat ?? null,
            transFat: data.transFat ?? null,
            sugar: data.sugar ?? null,
            micronutrientsJson: serializeMicronutrients(data.micronutrients ?? null),
            sourceDatabaseIngredientId: data.sourceDatabaseIngredientId ?? null,
            updatedAt: ts,
          },
        });

      const rows = await d.select().from(ingredients).where(eq(ingredients.id, data.id));
      return rowToDomain(rows[0]!);
    },

    async delete(userId, ingredientId) {
      // Verify ownership via join chain
      const rows = await d
        .select({ ingredientId: ingredients.id, userId: dailyMealLogs.userId })
        .from(ingredients)
        .innerJoin(meals, eq(ingredients.mealId, meals.id))
        .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
        .where(eq(ingredients.id, ingredientId));
      if (!rows[0] || rows[0].userId !== userId) return;
      await d.delete(ingredients).where(eq(ingredients.id, ingredientId));
    },
  };
}
