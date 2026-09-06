import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createPlanRepository } from './plans';
import { userProfiles, dailyMealLogs, meals, ingredients, goals } from '../schema';
import { DuplicatePlanNameError } from '@leanlog/data-access';
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

async function seedGoal(
  db: D1Database,
  userId: string,
  overrides: Partial<typeof goals.$inferInsert> = {},
): Promise<string> {
  const d = drizzle(db);
  const id = uuidv7();
  await d.insert(goals).values({
    id,
    userId,
    isBackground: true,
    mode: 'maintain',
    startDate: null,
    endDate: null,
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  });
  return id;
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

async function seedDayMeal(
  db: D1Database,
  dayId: string,
  name: string,
  opts: { logged?: boolean; withIngredient?: boolean } = {},
): Promise<string> {
  const d = drizzle(db);
  const id = uuidv7();
  await d.insert(meals).values({
    id,
    dailyMealLogId: dayId,
    name,
    origin: 'adhoc',
    logged: opts.logged ?? false,
    createdAt: ts(),
    updatedAt: ts(),
  });
  if (opts.withIngredient) {
    await d.insert(ingredients).values({
      id: uuidv7(),
      mealId: id,
      name: 'Existing food',
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
    });
  }
  return id;
}

function ingredientInput(overrides: Partial<UpsertPlanIngredient> = {}): UpsertPlanIngredient {
  return {
    id: uuidv7(),
    // Unused by the repository (it uses the planMealId function argument
    // instead), but required by the schema — mirrors the existing
    // UpsertTemplateIngredientSchema convention.
    planMealId: uuidv7(),
    name: 'Oats',
    weight: 80,
    calories: 300,
    fat: 5,
    saturatedFat: 1,
    carbs: 50,
    fiber: 8,
    protein: 10,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createPlanRepository', () => {
  let userId: string;
  beforeEach(() => {
    userId = `test-user-${uuidv7()}`;
  });

  describe('create / listByUser / getById', () => {
    test('creates a plan and returns it with no meals', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'High protein day' });
      expect(plan.name).toBe('High protein day');
      expect(plan.meals).toEqual([]);
    });

    test('rejects a duplicate name (case-insensitive) on create', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      await repo.create(userId, { name: 'High protein day' });
      await expect(repo.create(userId, { name: 'high protein day' })).rejects.toThrow(
        DuplicatePlanNameError,
      );
    });

    test('rejects a duplicate name on rename', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      await repo.create(userId, { name: 'Plan A' });
      const b = await repo.create(userId, { name: 'Plan B' });
      await expect(repo.rename(userId, b.id, 'plan a')).rejects.toThrow(DuplicatePlanNameError);
    });

    test('getById returns null for a plan belonging to another user', async () => {
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, userId);
      await seedUser(env.DB, otherUserId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Mine' });
      expect(await repo.getById(otherUserId, plan.id)).toBeNull();
    });

    test('listByUser returns summaries without ingredients, ordered by position', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'High protein day' });
      const meal = await repo.addMeal(userId, plan.id, { name: 'Breakfast' });
      await repo.upsertIngredient(userId, meal!.id, ingredientInput());

      const summaries = await repo.listByUser(userId);
      expect(summaries).toHaveLength(1);
      expect(summaries[0].meals).toEqual([expect.objectContaining({ name: 'Breakfast' })]);
      expect((summaries[0].meals[0] as { ingredients?: unknown }).ingredients).toBeUndefined();
    });
  });

  describe('meals and ingredients', () => {
    test('addMeal / renameMeal / removeMeal / reorderMeals', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Day' });
      const breakfast = await repo.addMeal(userId, plan.id, { name: 'Breakfast' });
      const lunch = await repo.addMeal(userId, plan.id, { name: 'Lunch' });

      const renamed = await repo.renameMeal(userId, breakfast!.id, 'Brunch');
      expect(renamed!.name).toBe('Brunch');

      const reordered = await repo.reorderMeals(userId, plan.id, [lunch!.id, breakfast!.id]);
      expect(reordered.map((m) => m.name)).toEqual(['Lunch', 'Brunch']);

      await repo.removeMeal(userId, breakfast!.id);
      const full = await repo.getById(userId, plan.id);
      expect(full!.meals).toHaveLength(1);
      expect(full!.meals[0].name).toBe('Lunch');
    });

    test('upsertIngredient / deleteIngredient scoped to owner', async () => {
      await seedUser(env.DB, userId);
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, otherUserId);

      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Day' });
      const meal = await repo.addMeal(userId, plan.id, { name: 'Breakfast' });

      const ing = await repo.upsertIngredient(otherUserId, meal!.id, ingredientInput());
      expect(ing).toBeNull();

      const added = await repo.upsertIngredient(userId, meal!.id, ingredientInput());
      expect(added).not.toBeNull();

      await repo.deleteIngredient(otherUserId, added!.id);
      let full = await repo.getById(userId, plan.id);
      expect(full!.meals[0].ingredients).toHaveLength(1);

      await repo.deleteIngredient(userId, added!.id);
      full = await repo.getById(userId, plan.id);
      expect(full!.meals[0].ingredients).toHaveLength(0);
    });
  });

  describe('duplicate (R16)', () => {
    test('forks a plan into a new one with the same meals and ingredients', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Original' });
      const meal = await repo.addMeal(userId, plan.id, { name: 'Breakfast' });
      const originalIngredient = await repo.upsertIngredient(userId, meal!.id, ingredientInput());

      const copy = await repo.duplicate(userId, plan.id);
      expect(copy).not.toBeNull();
      expect(copy!.id).not.toBe(plan.id);
      expect(copy!.name).toBe('Original copy');
      expect(copy!.meals).toHaveLength(1);
      expect(copy!.meals[0].id).not.toBe(meal!.id);
      expect(copy!.meals[0].ingredients).toHaveLength(1);
      expect(copy!.meals[0].ingredients[0].id).not.toBe(originalIngredient!.id);

      // Editing the copy must never affect the original (independent trees).
      await repo.renameMeal(userId, copy!.meals[0].id, 'Renamed');
      const reloadedOriginal = await repo.getById(userId, plan.id);
      expect(reloadedOriginal!.meals[0].name).toBe('Breakfast');
    });
  });

  describe('delete (R33)', () => {
    test('clears a goal default_plan_id pointing at the deleted plan, without touching the goal or days', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Default' });
      const goalId = await seedGoal(env.DB, userId, { defaultPlanId: plan.id });
      const dayId = await seedDay(env.DB, userId, '2026-06-01');

      await repo.delete(userId, plan.id);

      const d = drizzle(env.DB);
      const goalRows = await d.select().from(goals).where(eq(goals.id, goalId));
      expect(goalRows[0].defaultPlanId).toBeNull();

      const dayRows = await d.select().from(dailyMealLogs).where(eq(dailyMealLogs.id, dayId));
      expect(dayRows).toHaveLength(1);

      expect(await repo.getById(userId, plan.id)).toBeNull();
    });

    test('is a no-op for a plan belonging to another user', async () => {
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, userId);
      await seedUser(env.DB, otherUserId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Mine' });

      await repo.delete(otherUserId, plan.id);

      expect(await repo.getById(userId, plan.id)).not.toBeNull();
    });
  });

  describe('applyToDay (R19-R27)', () => {
    async function makePlanWithMeal(repo: ReturnType<typeof createPlanRepository>, name: string) {
      const plan = await repo.create(userId, { name: `Plan for ${name}` });
      const meal = await repo.addMeal(userId, plan.id, { name });
      await repo.upsertIngredient(userId, meal!.id, ingredientInput());
      return plan.id;
    }

    test('fills a matching empty, unlogged day meal (case-insensitive name match)', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const planId = await makePlanWithMeal(repo, 'Breakfast');
      const dayId = await seedDay(env.DB, userId, '2026-06-01');
      await seedDayMeal(env.DB, dayId, 'BREAKFAST');

      const result = await repo.applyToDay(userId, dayId, planId);
      expect(result).not.toBeNull();
      expect(result!.filled).toBe(1);
      expect(result!.skipped).toBe(0);
      expect(result!.day.meals).toHaveLength(1);
      expect(result!.day.meals[0].ingredients).toHaveLength(1);
      // Applied meals arrive unlogged (R23).
      expect(result!.day.meals[0].logged).toBe(false);
    });

    test('skips a matching meal that already has ingredients, and skips a logged meal', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const plan = await repo.create(userId, { name: 'Full day' });
      const breakfast = await repo.addMeal(userId, plan.id, { name: 'Breakfast' });
      await repo.upsertIngredient(userId, breakfast!.id, ingredientInput());
      const lunch = await repo.addMeal(userId, plan.id, { name: 'Lunch' });
      await repo.upsertIngredient(userId, lunch!.id, ingredientInput());

      const dayId = await seedDay(env.DB, userId, '2026-06-01');
      await seedDayMeal(env.DB, dayId, 'Breakfast', { withIngredient: true });
      await seedDayMeal(env.DB, dayId, 'Lunch', { logged: true });

      const result = await repo.applyToDay(userId, dayId, plan.id);
      expect(result!.filled).toBe(0);
      expect(result!.skipped).toBe(2);
      // Left completely untouched (R21): the pre-existing ingredient survives,
      // and the logged lunch received no ingredients.
      const breakfastDayMeal = result!.day.meals.find((m) => m.name === 'Breakfast')!;
      expect(breakfastDayMeal.ingredients).toHaveLength(1);
      expect(breakfastDayMeal.ingredients[0].name).toBe('Existing food');
      const lunchDayMeal = result!.day.meals.find((m) => m.name === 'Lunch')!;
      expect(lunchDayMeal.ingredients).toHaveLength(0);
    });

    test('appends a plan meal with no name match on the day, unlogged and deletable', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const planId = await makePlanWithMeal(repo, 'Pre-workout');
      const dayId = await seedDay(env.DB, userId, '2026-06-01');
      await seedDayMeal(env.DB, dayId, 'Breakfast');

      const result = await repo.applyToDay(userId, dayId, planId);
      expect(result!.filled).toBe(1);
      const appended = result!.day.meals.find((m) => m.name === 'Pre-workout');
      expect(appended).toBeDefined();
      expect(appended!.origin).toBe('template');
      expect(appended!.logged).toBe(false);
      expect(appended!.ingredients).toHaveLength(1);
    });

    test('applying the same plan twice is a no-op the second time (R25)', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const planId = await makePlanWithMeal(repo, 'Breakfast');
      const dayId = await seedDay(env.DB, userId, '2026-06-01');
      await seedDayMeal(env.DB, dayId, 'Breakfast');

      const first = await repo.applyToDay(userId, dayId, planId);
      expect(first!.filled).toBe(1);

      const second = await repo.applyToDay(userId, dayId, planId);
      expect(second!.filled).toBe(0);
      expect(second!.skipped).toBe(1);
      expect(second!.day.meals).toHaveLength(1);
    });

    test('snapshot independence: editing the plan after apply never changes the day (R24)', async () => {
      await seedUser(env.DB, userId);
      const repo = createPlanRepository(env.DB);
      const planId = await makePlanWithMeal(repo, 'Breakfast');
      const dayId = await seedDay(env.DB, userId, '2026-06-01');
      await seedDayMeal(env.DB, dayId, 'Breakfast');

      await repo.applyToDay(userId, dayId, planId);

      const plan = await repo.getById(userId, planId);
      await repo.upsertIngredient(
        userId,
        plan!.meals[0].id,
        ingredientInput({ name: 'Added later' }),
      );

      const d = drizzle(env.DB);
      const dayMealRows = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
      const dayIngredientRows = await d
        .select()
        .from(ingredients)
        .where(eq(ingredients.mealId, dayMealRows[0].id));
      expect(dayIngredientRows).toHaveLength(1);
      expect(dayIngredientRows[0].name).toBe('Oats');
    });

    test('returns null when the day belongs to another user', async () => {
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, userId);
      await seedUser(env.DB, otherUserId);
      const repo = createPlanRepository(env.DB);
      const planId = await makePlanWithMeal(repo, 'Breakfast');
      const dayId = await seedDay(env.DB, otherUserId, '2026-06-01');

      expect(await repo.applyToDay(userId, dayId, planId)).toBeNull();
    });

    test('returns null when the plan belongs to another user', async () => {
      const otherUserId = `other-user-${uuidv7()}`;
      await seedUser(env.DB, userId);
      await seedUser(env.DB, otherUserId);
      const repo = createPlanRepository(env.DB);
      const planId = await makePlanWithMeal(repo, 'Breakfast');
      const dayId = await seedDay(env.DB, otherUserId, '2026-06-01');
      const otherRepo = createPlanRepository(env.DB);
      expect(await otherRepo.applyToDay(otherUserId, dayId, planId)).toBeNull();
    });
  });
});
