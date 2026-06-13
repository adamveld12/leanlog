import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { meals, dailyMealLogs, ingredients } from '../schema';
import { TemplateMealNotDeletableError, EmptyMealNotLoggableError } from '@leanlog/data-access';
import type { MealRepository, Meal } from '@leanlog/data-access';

export function createMealRepository(db: D1Database): MealRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  async function ownerOf(mealId: string): Promise<{ userId: string; origin: string } | null> {
    const rows = await d
      .select({ userId: dailyMealLogs.userId, origin: meals.origin })
      .from(meals)
      .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
      .where(eq(meals.id, mealId));
    return rows[0] ?? null;
  }

  async function load(mealId: string): Promise<Meal> {
    const mealRow = (await d.select().from(meals).where(eq(meals.id, mealId)))[0]!;
    const ingredientRows = await d.select().from(ingredients).where(eq(ingredients.mealId, mealId));
    return { ...mealRow, ingredients: ingredientRows };
  }

  return {
    async create(_userId, dailyMealLogId, name) {
      const id = uuidv7();
      const ts = now();
      // Meals created through this path are always ad-hoc; template meals are
      // copied directly by the day repository on day creation.
      await d.insert(meals).values({
        id,
        dailyMealLogId,
        name,
        origin: 'adhoc',
        logged: false,
        createdAt: ts,
        updatedAt: ts,
      });
      const meal: Meal = {
        id,
        dailyMealLogId,
        name,
        origin: 'adhoc',
        logged: false,
        ingredients: [],
        createdAt: ts,
        updatedAt: ts,
      };
      return meal;
    },

    async rename(userId, mealId, name) {
      const ts = now();
      const owner = await ownerOf(mealId);
      if (!owner || owner.userId !== userId) {
        throw new Error(`Meal ${mealId} not found or access denied`);
      }
      await d.update(meals).set({ name, updatedAt: ts }).where(eq(meals.id, mealId));
      return load(mealId);
    },

    async setLogged(userId, mealId, logged) {
      const ts = now();
      const owner = await ownerOf(mealId);
      if (!owner || owner.userId !== userId) {
        throw new Error(`Meal ${mealId} not found or access denied`);
      }
      const meal = await load(mealId);
      // An empty meal cannot be logged — it would count as tracked while
      // contributing no nutrition (R29).
      if (logged && meal.ingredients.length === 0) {
        throw new EmptyMealNotLoggableError(mealId);
      }
      await d.update(meals).set({ logged, updatedAt: ts }).where(eq(meals.id, mealId));
      return { ...meal, logged, updatedAt: ts };
    },

    async delete(userId, mealId) {
      const owner = await ownerOf(mealId);
      if (!owner || owner.userId !== userId) return;
      // Copied template meals are fixed in structure and cannot be deleted (R19).
      if (owner.origin === 'template') throw new TemplateMealNotDeletableError(mealId);
      await d.delete(meals).where(eq(meals.id, mealId));
    },
  };
}
