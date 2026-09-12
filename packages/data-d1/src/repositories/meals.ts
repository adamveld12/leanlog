import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { meals, dailyMealLogs, ingredients } from '../schema';
import {
  TemplateMealNotDeletableError,
  EmptyMealNotLoggableError,
  estimateCalories,
} from '@leanlog/data-access';
import type { MealRepository, Meal } from '@leanlog/data-access';
import { rowToIngredient } from './ingredientRow';

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

  // Shared by addExtra and addExtraFromDatabase (#64, #93): resolves the day's
  // singleton 'extra' bucket and inserts one ingredient into it. When the bucket
  // doesn't exist yet, the meal and its first ingredient are written atomically —
  // a sequential pair of awaits could leave an empty orphaned "Extras" meal
  // behind if the ingredient insert failed. Returns null when the day isn't the
  // user's, so callers can map that to a 404.
  async function insertIntoExtrasBucket(
    userId: string,
    dailyMealLogId: string,
    build: (mealId: string, ts: string) => typeof ingredients.$inferInsert,
  ): Promise<Meal | null> {
    const dayRows = await d
      .select({ userId: dailyMealLogs.userId })
      .from(dailyMealLogs)
      .where(eq(dailyMealLogs.id, dailyMealLogId));
    if (!dayRows[0] || dayRows[0].userId !== userId) return null;

    const ts = now();
    const existing = (
      await d
        .select()
        .from(meals)
        .where(and(eq(meals.dailyMealLogId, dailyMealLogId), eq(meals.origin, 'extra')))
    )[0];
    const mealId = existing?.id ?? uuidv7();
    const ingredientInsert = d.insert(ingredients).values(build(mealId, ts));

    if (existing) {
      await ingredientInsert;
    } else {
      const mealInsert = d.insert(meals).values({
        id: mealId,
        dailyMealLogId,
        name: 'Extras',
        origin: 'extra',
        logged: false,
        createdAt: ts,
        updatedAt: ts,
      });
      await d.batch([mealInsert, ingredientInsert]);
    }

    return load(mealId);
  }

  async function load(mealId: string): Promise<Meal> {
    const mealRow = (await d.select().from(meals).where(eq(meals.id, mealId)))[0]!;
    const ingredientRows = await d.select().from(ingredients).where(eq(ingredients.mealId, mealId));
    return { ...mealRow, ingredients: ingredientRows.map(rowToIngredient) };
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
      // #41 R19 protected every copied meal outright. Narrowed for #84: an
      // unlogged copied meal (from a goal's default plan, or appended by
      // applying a plan) is still just a plan — it stays removable. Once
      // logged it is recorded history and stays protected.
      const meal = await load(mealId);
      if (owner.origin === 'template' && meal.logged) {
        throw new TemplateMealNotDeletableError(mealId);
      }
      await d.delete(meals).where(eq(meals.id, mealId));
    },

    async addExtra(userId, dailyMealLogId, data) {
      // Calories are always explicit for an Extra (R12) — never re-estimated.
      // estimatedCalories is still recorded for consistency with every other
      // ingredient row, purely as informational metadata.
      const estimated = estimateCalories({
        fat: data.fat ?? 0,
        carbs: data.carbs ?? 0,
        protein: data.protein ?? 0,
      });
      return insertIntoExtrasBucket(userId, dailyMealLogId, (mealId, ts) => ({
        id: data.id,
        mealId,
        name: data.name,
        weight: 0,
        calories: data.calories,
        estimatedCalories: estimated,
        calorieSource: 'explicit',
        fat: data.fat ?? 0,
        saturatedFat: 0,
        carbs: data.carbs ?? 0,
        fiber: 0,
        protein: data.protein ?? 0,
        createdAt: ts,
        updatedAt: ts,
      }));
    },

    async addExtraFromDatabase(userId, dailyMealLogId, ingredient) {
      // The label's printed calories stay explicit (#93 R6), matching how the
      // meal-level from-database route forwards them.
      const estimated = estimateCalories({
        fat: ingredient.fat,
        carbs: ingredient.carbs,
        protein: ingredient.protein,
        fiber: ingredient.fiber,
        sugarAlcohol: ingredient.sugarAlcohol,
        allulose: ingredient.allulose,
        alcohol: ingredient.alcohol,
      });
      return insertIntoExtrasBucket(userId, dailyMealLogId, (mealId, ts) => ({
        id: ingredient.id,
        mealId,
        name: ingredient.name,
        weight: ingredient.weight,
        calories: ingredient.calories,
        estimatedCalories: estimated,
        calorieSource: 'explicit',
        fat: ingredient.fat,
        saturatedFat: ingredient.saturatedFat ?? 0,
        carbs: ingredient.carbs,
        fiber: ingredient.fiber ?? 0,
        protein: ingredient.protein,
        unsaturatedFat: ingredient.unsaturatedFat ?? null,
        monounsaturatedFat: ingredient.monounsaturatedFat ?? null,
        polyunsaturatedFat: ingredient.polyunsaturatedFat ?? null,
        transFat: ingredient.transFat ?? null,
        sugar: ingredient.sugar ?? null,
        sugarAlcohol: ingredient.sugarAlcohol ?? null,
        allulose: ingredient.allulose ?? null,
        alcohol: ingredient.alcohol ?? null,
        micronutrientsJson: ingredient.micronutrients
          ? JSON.stringify(ingredient.micronutrients)
          : null,
        sourceDatabaseIngredientId: ingredient.sourceDatabaseIngredientId,
        createdAt: ts,
        updatedAt: ts,
      }));
    },
  };
}
