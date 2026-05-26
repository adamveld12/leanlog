import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { dailyMealLogs, meals, ingredients } from '../schema';
import type { DayRepository, CreateDailyMealLog, DayTargets } from '@leanlog/data-access';

export function createDayRepository(db: D1Database): DayRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  return {
    async listByUser(userId) {
      const dayRows = await d
        .select()
        .from(dailyMealLogs)
        .where(eq(dailyMealLogs.userId, userId))
        .orderBy(dailyMealLogs.date);

      if (dayRows.length === 0) return [];

      const dayIds = dayRows.map((r) => r.id);
      const mealRows = await d.select().from(meals).where(inArray(meals.dailyMealLogId, dayIds));

      const mealIds = mealRows.map((r) => r.id);
      const ingredientRows =
        mealIds.length > 0
          ? await d.select().from(ingredients).where(inArray(ingredients.mealId, mealIds))
          : [];

      return dayRows.map((day) => ({
        ...day,
        targetCalories: day.targetCalories,
        targetFat: day.targetFat,
        targetCarbs: day.targetCarbs,
        targetProtein: day.targetProtein,
        meals: mealRows
          .filter((m) => m.dailyMealLogId === day.id)
          .map((meal) => ({
            ...meal,
            dailyMealLogId: meal.dailyMealLogId,
            ingredients: ingredientRows.filter((i) => i.mealId === meal.id),
          })),
      }));
    },

    async getById(userId, dayId) {
      const rows = await d.select().from(dailyMealLogs).where(eq(dailyMealLogs.id, dayId));
      const day = rows[0];
      if (!day || day.userId !== userId) return null;

      const mealRows = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
      const ingredientRows =
        mealRows.length > 0
          ? await d
              .select()
              .from(ingredients)
              .where(
                inArray(
                  ingredients.mealId,
                  mealRows.map((m) => m.id),
                ),
              )
          : [];

      return {
        ...day,
        meals: mealRows.map((meal) => ({
          ...meal,
          dailyMealLogId: meal.dailyMealLogId,
          ingredients: ingredientRows.filter((i) => i.mealId === meal.id),
        })),
      };
    },

    async create(userId, data: CreateDailyMealLog) {
      const id = uuidv7();
      const ts = now();
      await d.insert(dailyMealLogs).values({
        id,
        userId,
        date: data.date,
        targetCalories: data.targetCalories,
        targetFat: data.targetFat,
        targetCarbs: data.targetCarbs,
        targetProtein: data.targetProtein,
        mealCountTarget: data.mealCountTarget ?? 3,
        createdAt: ts,
        updatedAt: ts,
      });
      return {
        id,
        userId,
        meals: [],
        ...data,
        mealCountTarget: data.mealCountTarget ?? 3,
        createdAt: ts,
        updatedAt: ts,
      };
    },

    async updateTargets(userId, dayId, targets: DayTargets) {
      const ts = now();
      await d
        .update(dailyMealLogs)
        .set({ ...targets, updatedAt: ts })
        .where(eq(dailyMealLogs.id, dayId));
      const updated = await this.getById(userId, dayId);
      return updated!;
    },

    async delete(userId, dayId) {
      const rows = await d
        .select({ id: dailyMealLogs.id, userId: dailyMealLogs.userId })
        .from(dailyMealLogs)
        .where(eq(dailyMealLogs.id, dayId));
      if (!rows[0] || rows[0].userId !== userId) return;
      await d.delete(dailyMealLogs).where(eq(dailyMealLogs.id, dayId));
    },
  };
}
