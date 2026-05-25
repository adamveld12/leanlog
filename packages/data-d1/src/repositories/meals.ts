import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { meals, dailyMealLogs } from '../schema';
import type { MealRepository, Meal } from '@leanlog/data-access';

export function createMealRepository(db: D1Database): MealRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  return {
    async create(_userId, dailyMealLogId, name) {
      const id = uuidv7();
      const ts = now();
      await d.insert(meals).values({
        id,
        dailyMealLogId,
        name,
        createdAt: ts,
        updatedAt: ts,
      });
      const meal: Meal = {
        id,
        dailyMealLogId,
        name,
        ingredients: [],
        createdAt: ts,
        updatedAt: ts,
      };
      return meal;
    },

    async rename(userId, mealId, name) {
      const ts = now();
      // Verify ownership via join
      const rows = await d
        .select({ mealId: meals.id, userId: dailyMealLogs.userId })
        .from(meals)
        .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
        .where(eq(meals.id, mealId));
      if (!rows[0] || rows[0].userId !== userId) {
        throw new Error(`Meal ${mealId} not found or access denied`);
      }
      await d.update(meals).set({ name, updatedAt: ts }).where(eq(meals.id, mealId));
      const updated = await d.select().from(meals).where(eq(meals.id, mealId));
      return { ...updated[0]!, ingredients: [] };
    },

    async delete(userId, mealId) {
      const rows = await d
        .select({ mealId: meals.id, userId: dailyMealLogs.userId })
        .from(meals)
        .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
        .where(eq(meals.id, mealId));
      if (!rows[0] || rows[0].userId !== userId) return;
      await d.delete(meals).where(eq(meals.id, mealId));
    },
  };
}
