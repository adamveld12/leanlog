import { eq, count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { ingredients, meals, dailyMealLogs } from '../schema';
import { estimateCalories } from '@leanlog/data-access';
import { rowToIngredient, serializeMicronutrients } from './ingredientRow';
import type { IngredientRepository, UpsertIngredient } from '@leanlog/data-access';

export function createIngredientRepository(db: D1Database): IngredientRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  return {
    async upsert(userId, mealId, data: UpsertIngredient) {
      // Verify ownership: the target meal must belong to the user
      const ownerRows = await d
        .select({ mealId: meals.id, userId: dailyMealLogs.userId, origin: meals.origin })
        .from(meals)
        .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
        .where(eq(meals.id, mealId));
      if (!ownerRows[0] || ownerRows[0].userId !== userId) return null;

      const ts = now();
      const estimated = estimateCalories({
        fat: data.fat,
        carbs: data.carbs,
        protein: data.protein,
        fiber: data.fiber,
        sugarAlcohol: data.sugarAlcohol,
        allulose: data.allulose,
        alcohol: data.alcohol,
      });
      const explicit = data.calories ?? null;
      const calories = explicit ?? estimated;
      const calorieSource = explicit != null ? ('explicit' as const) : ('estimated' as const);

      await d
        .insert(ingredients)
        .values({
          id: data.id,
          mealId: data.mealId,
          name: data.name,
          weight: data.weight,
          calories,
          estimatedCalories: estimated,
          calorieSource,
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
          sugarAlcohol: data.sugarAlcohol ?? null,
          allulose: data.allulose ?? null,
          alcohol: data.alcohol ?? null,
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
            estimatedCalories: estimated,
            calorieSource,
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
            sugarAlcohol: data.sugarAlcohol ?? null,
            allulose: data.allulose ?? null,
            alcohol: data.alcohol ?? null,
            micronutrientsJson: serializeMicronutrients(data.micronutrients ?? null),
            sourceDatabaseIngredientId: data.sourceDatabaseIngredientId ?? null,
            updatedAt: ts,
          },
        });

      // Adding or editing an ingredient confirms a copied meal as logged (R30).
      // Ad-hoc meals have no logged state, so leave them untouched.
      if (ownerRows[0].origin === 'template') {
        await d.update(meals).set({ logged: true, updatedAt: ts }).where(eq(meals.id, mealId));
      }

      const rows = await d.select().from(ingredients).where(eq(ingredients.id, data.id));
      return rowToIngredient(rows[0]!);
    },

    async delete(userId, ingredientId) {
      // Verify ownership via join chain
      const rows = await d
        .select({
          ingredientId: ingredients.id,
          userId: dailyMealLogs.userId,
          mealId: meals.id,
          origin: meals.origin,
        })
        .from(ingredients)
        .innerJoin(meals, eq(ingredients.mealId, meals.id))
        .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
        .where(eq(ingredients.id, ingredientId));
      if (!rows[0] || rows[0].userId !== userId) return;
      await d.delete(ingredients).where(eq(ingredients.id, ingredientId));

      // Deleting the last ingredient returns a copied meal to unlogged (R31).
      if (rows[0].origin === 'template') {
        const remaining = await d
          .select({ n: count() })
          .from(ingredients)
          .where(eq(ingredients.mealId, rows[0].mealId));
        if ((remaining[0]?.n ?? 0) === 0) {
          await d
            .update(meals)
            .set({ logged: false, updatedAt: new Date().toISOString() })
            .where(eq(meals.id, rows[0].mealId));
        }
      }
    },
  };
}
