import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { createDayRepository } from './days';
import { userProfiles, dailyMealLogs, meals, ingredients } from '../schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ts = () => new Date().toISOString();

async function seedUser(db: D1Database, clerkUserId: string) {
  const d = drizzle(db);
  await d.insert(userProfiles).values({
    id: uuidv7(),
    clerkUserId,
    createdAt: ts(),
    updatedAt: ts(),
  });
}

async function seedDay(db: D1Database, userId: string, date: string): Promise<string> {
  const d = drizzle(db);
  const id = uuidv7();
  await d.insert(dailyMealLogs).values({
    id,
    userId,
    date,
    targetCalories: 2000,
    targetFat: 70,
    targetCarbs: 250,
    targetProtein: 140,
    mealCountTarget: 0,
    createdAt: ts(),
    updatedAt: ts(),
  });
  return id;
}

async function seedMeals(db: D1Database, dayId: string, count: number): Promise<string[]> {
  const d = drizzle(db);
  const ids = Array.from({ length: count }, () => uuidv7());
  // Insert one row at a time via batch to stay within D1's 100-param-per-statement cap.
  const stmts = ids.map((id, i) =>
    d.insert(meals).values({
      id,
      dailyMealLogId: dayId,
      name: `Meal ${i + 1}`,
      origin: 'adhoc',
      logged: false,
      createdAt: ts(),
      updatedAt: ts(),
    }),
  );
  for (let i = 0; i < stmts.length; i += 50) {
    await d.batch(stmts.slice(i, i + 50) as [(typeof stmts)[0], ...typeof stmts]);
  }
  return ids;
}

async function seedIngredients(db: D1Database, mealIds: string[]): Promise<void> {
  const d = drizzle(db);
  const stmts = mealIds.map((mealId, i) =>
    d.insert(ingredients).values({
      id: uuidv7(),
      mealId,
      name: `Ingredient ${i + 1}`,
      weight: 100,
      calories: 200,
      fat: 10,
      saturatedFat: 2,
      carbs: 20,
      fiber: 3,
      protein: 15,
      calorieSource: 'explicit',
      estimatedCalories: 200,
      createdAt: ts(),
      updatedAt: ts(),
    }),
  );
  for (let i = 0; i < stmts.length; i += 50) {
    await d.batch(stmts.slice(i, i + 50) as [(typeof stmts)[0], ...typeof stmts]);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createDayRepository', () => {
  // Each test uses a unique clerkUserId so tests don't interfere with each other
  // even though they share the same D1 instance within a test file.
  let userId: string;
  beforeEach(() => {
    userId = `test-user-${uuidv7()}`;
  });

  describe('listByUser', () => {
    test('returns empty array for a user with no days', async () => {
      await seedUser(env.DB, userId);
      const repo = createDayRepository(env.DB);
      const result = await repo.listByUser(userId);
      expect(result).toEqual([]);
    });

    test('correctly nests meals and ingredients for a small dataset', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');
      const mealIds = await seedMeals(env.DB, dayId, 2);
      await seedIngredients(env.DB, mealIds);

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);

      expect(days).toHaveLength(1);
      expect(days[0].id).toBe(dayId);
      expect(days[0].meals).toHaveLength(2);
      for (const meal of days[0].meals) {
        expect(meal.ingredients).toHaveLength(1);
      }
    });

    test('handles a user with multiple days and returns them in date order', async () => {
      await seedUser(env.DB, userId);
      await seedDay(env.DB, userId, '2026-01-03');
      await seedDay(env.DB, userId, '2026-01-01');
      await seedDay(env.DB, userId, '2026-01-02');

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);

      expect(days).toHaveLength(3);
      expect(days.map((d) => d.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03']);
    });

    // Regression test: the old inArray(meals.dailyMealLogId, dayIds) query failed
    // once a user had >100 days because D1 caps bound parameters at 100 per query.
    test('handles >100 days without hitting the D1 bound-parameter cap', async () => {
      await seedUser(env.DB, userId);
      for (let i = 0; i < 120; i++) {
        const date = `2026-${String(Math.floor(i / 30) + 1).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`;
        const dayId = await seedDay(env.DB, userId, date);
        await seedMeals(env.DB, dayId, 1);
      }

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);

      expect(days).toHaveLength(120);
      for (const day of days) {
        expect(day.meals).toHaveLength(1);
      }
    });

    // Regression test: the old inArray(ingredients.mealId, mealIds) query failed
    // once a user's total meal count across all days exceeded 100, because D1 caps
    // bound parameters at 100 per query.
    test('handles a day with >100 meals without hitting the D1 bound-parameter cap', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');
      const mealIds = await seedMeals(env.DB, dayId, 120);
      await seedIngredients(env.DB, mealIds);

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);

      expect(days).toHaveLength(1);
      expect(days[0].meals).toHaveLength(120);
      const ingredientCount = days[0].meals.reduce((n, m) => n + m.ingredients.length, 0);
      expect(ingredientCount).toBe(120);
    });

    test('returns day with empty meals array when day has no meals', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);

      expect(days).toHaveLength(1);
      expect(days[0].id).toBe(dayId);
      expect(days[0].meals).toEqual([]);
    });

    test('returns meal with empty ingredients array when meal has no ingredients', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');
      await seedMeals(env.DB, dayId, 1);

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);

      expect(days).toHaveLength(1);
      expect(days[0].meals).toHaveLength(1);
      expect(days[0].meals[0].ingredients).toEqual([]);
    });

    test('does not return days belonging to another user', async () => {
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, userId);
      await seedUser(env.DB, otherUserId);
      await seedDay(env.DB, otherUserId, '2026-01-01');

      const repo = createDayRepository(env.DB);
      const days = await repo.listByUser(userId);
      expect(days).toHaveLength(0);
    });
  });

  describe('getById', () => {
    test('returns null for a day belonging to another user', async () => {
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, userId);
      await seedUser(env.DB, otherUserId);
      const dayId = await seedDay(env.DB, otherUserId, '2026-01-01');

      const repo = createDayRepository(env.DB);
      expect(await repo.getById(userId, dayId)).toBeNull();
    });

    test('returns a day with correctly nested meals and ingredients', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');
      const mealIds = await seedMeals(env.DB, dayId, 3);
      await seedIngredients(env.DB, mealIds);

      const repo = createDayRepository(env.DB);
      const day = await repo.getById(userId, dayId);

      expect(day).not.toBeNull();
      expect(day!.id).toBe(dayId);
      expect(day!.meals).toHaveLength(3);
      for (const meal of day!.meals) {
        expect(meal.ingredients).toHaveLength(1);
      }
    });

    // Regression test: the old inArray(ingredients.mealId, mealIds) inside getById
    // would also hit the 100-param cap on a single day with >100 meals.
    test('handles a day with >100 meals without hitting the D1 bound-parameter cap', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');
      const mealIds = await seedMeals(env.DB, dayId, 120);
      await seedIngredients(env.DB, mealIds);

      const repo = createDayRepository(env.DB);
      const day = await repo.getById(userId, dayId);

      expect(day).not.toBeNull();
      expect(day!.meals).toHaveLength(120);
      const ingredientCount = day!.meals.reduce((n, m) => n + m.ingredients.length, 0);
      expect(ingredientCount).toBe(120);
    });
  });
});
