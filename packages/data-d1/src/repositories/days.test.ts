import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createDayRepository } from './days';
import { createPlanRepository } from './plans';
import { userProfiles, dailyMealLogs, meals, ingredients, goals } from '../schema';
import type { UpsertPlanIngredient } from '@leanlog/data-access';

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

  // #84: day creation materializes the covering goal's default plan, or the
  // four default meals when it has none — the degenerate case of applying a
  // plan to an empty day (same rule as plans.applyToDay).
  describe('create — plan materialization', () => {
    function createInput(goalId?: string) {
      return {
        date: '2026-06-01',
        targetCalories: 2000,
        targetFat: 70,
        targetCarbs: 250,
        targetProtein: 140,
        mealCountTarget: 3,
        goalId,
      };
    }

    async function seedGoalWithPlan(
      planMealNames: string[],
    ): Promise<{ goalId: string; planId: string }> {
      const planRepo = createPlanRepository(env.DB);
      const plan = await planRepo.create(userId, { name: 'Default' });
      for (const name of planMealNames) {
        const meal = await planRepo.addMeal(userId, plan.id, { name });
        await planRepo.upsertIngredient(userId, meal!.id, {
          id: uuidv7(),
          planMealId: meal!.id,
          name: 'Oats',
          weight: 80,
          calories: 300,
          fat: 5,
          saturatedFat: 1,
          carbs: 50,
          fiber: 8,
          protein: 10,
        } satisfies UpsertPlanIngredient);
      }
      const d = drizzle(env.DB);
      const goalId = uuidv7();
      await d.insert(goals).values({
        id: goalId,
        userId,
        isBackground: true,
        mode: 'maintain',
        startDate: null,
        endDate: null,
        defaultPlanId: plan.id,
        createdAt: ts(),
        updatedAt: ts(),
      });
      return { goalId, planId: plan.id };
    }

    test('a goal with a default plan materializes its meals and ingredients, unlogged', async () => {
      await seedUser(env.DB, userId);
      const { goalId } = await seedGoalWithPlan(['Breakfast', 'Lunch']);

      const repo = createDayRepository(env.DB);
      const day = await repo.create(userId, createInput(goalId));

      expect(day.meals.map((m) => m.name)).toEqual(['Breakfast', 'Lunch']);
      for (const meal of day.meals) {
        expect(meal.logged).toBe(false);
        expect(meal.origin).toBe('template');
        expect(meal.ingredients).toHaveLength(1);
      }
    });

    test('a goal with no default plan yields the four default meals (R30)', async () => {
      await seedUser(env.DB, userId);
      const d = drizzle(env.DB);
      const goalId = uuidv7();
      await d.insert(goals).values({
        id: goalId,
        userId,
        isBackground: true,
        mode: 'maintain',
        startDate: null,
        endDate: null,
        defaultPlanId: null,
        createdAt: ts(),
        updatedAt: ts(),
      });

      const repo = createDayRepository(env.DB);
      const day = await repo.create(userId, createInput(goalId));

      expect(day.meals.map((m) => m.name)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
      expect(day.meals.every((m) => m.ingredients.length === 0)).toBe(true);
    });

    test('no goalId also yields the four default meals', async () => {
      await seedUser(env.DB, userId);
      const repo = createDayRepository(env.DB);
      const day = await repo.create(userId, createInput(undefined));
      expect(day.meals.map((m) => m.name)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
    });

    test('editing the plan after day creation leaves the day unchanged (R32)', async () => {
      await seedUser(env.DB, userId);
      const { goalId, planId } = await seedGoalWithPlan(['Breakfast']);

      const repo = createDayRepository(env.DB);
      const day = await repo.create(userId, createInput(goalId));
      expect(day.meals[0].ingredients).toHaveLength(1);

      const planRepo = createPlanRepository(env.DB);
      const plan = await planRepo.getById(userId, planId);
      await planRepo.upsertIngredient(userId, plan!.meals[0].id, {
        id: uuidv7(),
        planMealId: plan!.meals[0].id,
        name: 'Added later',
        weight: 50,
        calories: 100,
        fat: 1,
        saturatedFat: 0,
        carbs: 20,
        fiber: 1,
        protein: 2,
      } satisfies UpsertPlanIngredient);

      const reloaded = await repo.getById(userId, day.id);
      expect(reloaded!.meals[0].ingredients).toHaveLength(1);
      expect(reloaded!.meals[0].ingredients[0].name).toBe('Oats');
    });

    test('repointing a goal to a different plan only affects days created afterward', async () => {
      await seedUser(env.DB, userId);
      const { goalId } = await seedGoalWithPlan(['Breakfast']);

      const planRepo = createPlanRepository(env.DB);
      const planB = await planRepo.create(userId, { name: 'Plan B' });
      await planRepo.addMeal(userId, planB.id, { name: 'Second Breakfast' });

      const repo = createDayRepository(env.DB);
      const existingDay = await repo.create(userId, createInput(goalId));
      expect(existingDay.meals.map((m) => m.name)).toEqual(['Breakfast']);

      const d = drizzle(env.DB);
      await d.update(goals).set({ defaultPlanId: planB.id }).where(eq(goals.id, goalId));

      const newDay = await repo.create(userId, { ...createInput(goalId), date: '2026-06-02' });
      expect(newDay.meals.map((m) => m.name)).toEqual(['Second Breakfast']);

      const reloadedExisting = await repo.getById(userId, existingDay.id);
      expect(reloadedExisting!.meals.map((m) => m.name)).toEqual(['Breakfast']);
    });
  });

  // #68: body-circumference measurements ride the same per-day model and write
  // path as weight (updateTargets), independent of whether weight was logged.
  describe('updateTargets — body measurements', () => {
    test('persists shoulder/waist/bicep/thigh and round-trips through getById', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');

      const repo = createDayRepository(env.DB);
      const updated = await repo.updateTargets(userId, dayId, {
        shoulderInches: 50,
        waistInches: 32,
        bicepInches: 15.5,
        thighInches: 23,
      });

      expect(updated.shoulderInches).toBe(50);
      expect(updated.waistInches).toBe(32);
      expect(updated.bicepInches).toBe(15.5);
      expect(updated.thighInches).toBe(23);

      const reloaded = await repo.getById(userId, dayId);
      expect(reloaded!.shoulderInches).toBe(50);
      expect(reloaded!.waistInches).toBe(32);
    });

    test('allows partial entry (waist only) without touching weight or other sites', async () => {
      await seedUser(env.DB, userId);
      const dayId = await seedDay(env.DB, userId, '2026-01-01');

      const repo = createDayRepository(env.DB);
      const updated = await repo.updateTargets(userId, dayId, { waistInches: 33 });

      expect(updated.waistInches).toBe(33);
      expect(updated.shoulderInches).toBeNull();
      expect(updated.bicepInches).toBeNull();
      expect(updated.thighInches).toBeNull();
      expect(updated.weightLbs).toBeNull();
    });
  });
});
