import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { ingredients, meals, dailyMealLogs } from '../schema';
import type { IngredientRepository, Ingredient, UpsertIngredient } from '@leanlog/data-access';

export function createIngredientRepository(db: D1Database): IngredientRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  return {
    async upsert(_userId, _mealId, data: UpsertIngredient) {
      const ts = now();
      await d
        .insert(ingredients)
        .values({
          id: data.id,
          mealId: data.mealId,
          name: data.name,
          weight: data.weight,
          calories: data.calories,
          fat: data.fat,
          saturatedFat: data.saturatedFat,
          carbs: data.carbs,
          fiber: data.fiber,
          protein: data.protein,
          createdAt: ts,
          updatedAt: ts,
        })
        .onConflictDoUpdate({
          target: ingredients.id,
          set: {
            name: data.name,
            weight: data.weight,
            calories: data.calories,
            fat: data.fat,
            saturatedFat: data.saturatedFat,
            carbs: data.carbs,
            fiber: data.fiber,
            protein: data.protein,
            updatedAt: ts,
          },
        });

      const rows = await d.select().from(ingredients).where(eq(ingredients.id, data.id));
      return rows[0]! as Ingredient;
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
