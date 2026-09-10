import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createMealRepository } from './meals';
import { userProfiles, dailyMealLogs, meals, ingredients } from '../schema';
import { TemplateMealNotDeletableError } from '@leanlog/data-access';
import type { ExtraDatabaseIngredient } from '@leanlog/data-access';

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

async function seedDay(db: D1Database, userId: string): Promise<string> {
  const d = drizzle(db);
  const id = uuidv7();
  await d.insert(dailyMealLogs).values({
    id,
    userId,
    date: '2026-06-01',
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

async function seedTemplateMeal(
  db: D1Database,
  dayId: string,
  opts: { logged?: boolean; withIngredient?: boolean } = {},
): Promise<string> {
  const d = drizzle(db);
  const id = uuidv7();
  await d.insert(meals).values({
    id,
    dailyMealLogId: dayId,
    name: 'Breakfast',
    origin: 'template',
    logged: opts.logged ?? false,
    createdAt: ts(),
    updatedAt: ts(),
  });
  if (opts.withIngredient) {
    await d.insert(ingredients).values({
      id: uuidv7(),
      mealId: id,
      name: 'Oats',
      weight: 80,
      calories: 300,
      fat: 5,
      saturatedFat: 1,
      carbs: 50,
      fiber: 8,
      protein: 10,
      calorieSource: 'explicit',
      estimatedCalories: 300,
      createdAt: ts(),
      updatedAt: ts(),
    });
  }
  return id;
}

describe('createMealRepository — delete guard (#84 narrowing of #41 R19)', () => {
  let userId: string;
  beforeEach(() => {
    userId = `test-user-${uuidv7()}`;
  });

  test('blocks deleting a logged template meal', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const mealId = await seedTemplateMeal(env.DB, dayId, { logged: true, withIngredient: true });

    const repo = createMealRepository(env.DB);
    await expect(repo.delete(userId, mealId)).rejects.toThrow(TemplateMealNotDeletableError);
  });

  test('allows deleting an unlogged template meal (e.g. an unwanted plan-goal default)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const mealId = await seedTemplateMeal(env.DB, dayId, { logged: false });

    const repo = createMealRepository(env.DB);
    await repo.delete(userId, mealId);

    const d = drizzle(env.DB);
    const rows = await d.select().from(meals).where(eq(meals.id, mealId));
    expect(rows).toHaveLength(0);
  });

  test('allows deleting an unlogged template meal even with ingredients (an appended plan meal)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const mealId = await seedTemplateMeal(env.DB, dayId, { logged: false, withIngredient: true });

    const repo = createMealRepository(env.DB);
    await repo.delete(userId, mealId);

    const d = drizzle(env.DB);
    const rows = await d.select().from(meals).where(eq(meals.id, mealId));
    expect(rows).toHaveLength(0);
  });
});

describe('createMealRepository — addExtra (#64)', () => {
  let userId: string;
  beforeEach(() => {
    userId = `test-user-${uuidv7()}`;
  });

  test('creates the Extras bucket meal on the first call', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const meal = await repo.addExtra(userId, dayId, {
      id: uuidv7(),
      name: 'Tortilla chips',
      calories: 150,
    });

    expect(meal).not.toBeNull();
    expect(meal!.name).toBe('Extras');
    expect(meal!.origin).toBe('extra');
    expect(meal!.ingredients).toHaveLength(1);
    expect(meal!.ingredients[0].name).toBe('Tortilla chips');
    expect(meal!.ingredients[0].calories).toBe(150);
  });

  test('reuses the same Extras meal for a second item (idempotent find-or-create)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const first = await repo.addExtra(userId, dayId, {
      id: uuidv7(),
      name: 'Tortilla chips',
      calories: 150,
    });
    const second = await repo.addExtra(userId, dayId, {
      id: uuidv7(),
      name: 'Red wine',
      calories: 125,
    });

    expect(second!.id).toBe(first!.id);
    expect(second!.ingredients).toHaveLength(2);

    const d = drizzle(env.DB);
    const extrasMeals = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
    expect(extrasMeals.filter((m) => m.origin === 'extra')).toHaveLength(1);
  });

  test('calories are stored explicit and never re-estimated (R12)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    // fat/carbs/protein would estimate to far more than 10 kcal if re-derived.
    const meal = await repo.addExtra(userId, dayId, {
      id: uuidv7(),
      name: 'Underestimated snack',
      calories: 10,
      fat: 20,
      carbs: 30,
      protein: 40,
    });

    const ingredient = meal!.ingredients[0];
    expect(ingredient.calories).toBe(10);
    expect(ingredient.calorieSource).toBe('explicit');
  });

  test('macros default to zero when omitted (R2)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const meal = await repo.addExtra(userId, dayId, {
      id: uuidv7(),
      name: 'Red wine',
      calories: 125,
    });

    const ingredient = meal!.ingredients[0];
    expect(ingredient.fat).toBe(0);
    expect(ingredient.carbs).toBe(0);
    expect(ingredient.protein).toBe(0);
  });

  test('returns null when the day does not belong to the user', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const meal = await repo.addExtra('someone-else', dayId, {
      id: uuidv7(),
      name: 'Chips',
      calories: 150,
    });

    expect(meal).toBeNull();
  });
});

// #93 — Extras added by database lookup persist the full scaled label snapshot,
// not just the calories + three macros the manual quick-add captures.
describe('mealRepository.addExtraFromDatabase', () => {
  let userId: string;

  beforeEach(() => {
    userId = `test-user-${uuidv7()}`;
  });

  function snapshot(overrides: Partial<ExtraDatabaseIngredient> = {}): ExtraDatabaseIngredient {
    return {
      id: uuidv7(),
      name: 'Chobani Greek Yogurt',
      weight: 170,
      calories: 120,
      fat: 0,
      carbs: 9,
      protein: 15,
      fiber: 2,
      saturatedFat: 0.5,
      micronutrients: [{ name: 'Calcium', amount: 187, unit: 'milligram' }],
      sourceDatabaseIngredientId: 'db-ingredient-1',
      ...overrides,
    };
  }

  test('creates the Extras bucket on the first database add (R7)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const meal = await repo.addExtraFromDatabase(userId, dayId, snapshot());

    expect(meal!.origin).toBe('extra');
    expect(meal!.name).toBe('Extras');
    expect(meal!.ingredients).toHaveLength(1);
    expect(meal!.ingredients[0].name).toBe('Chobani Greek Yogurt');
  });

  test('persists the full snapshot, not just calories and macros (R5)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const meal = await repo.addExtraFromDatabase(userId, dayId, snapshot());

    const ingredient = meal!.ingredients[0];
    expect(ingredient.weight).toBe(170);
    expect(ingredient.fiber).toBe(2);
    expect(ingredient.saturatedFat).toBe(0.5);
    expect(ingredient.micronutrients).toEqual([
      { name: 'Calcium', amount: 187, unit: 'milligram' },
    ]);
    expect(ingredient.sourceDatabaseIngredientId).toBe('db-ingredient-1');
  });

  test("keeps the label's printed calories explicit (R6)", async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    // Re-deriving from these macros would give far more than 10 kcal.
    const meal = await repo.addExtraFromDatabase(
      userId,
      dayId,
      snapshot({ calories: 10, fat: 20, carbs: 30, protein: 40 }),
    );

    const ingredient = meal!.ingredients[0];
    expect(ingredient.calories).toBe(10);
    expect(ingredient.calorieSource).toBe('explicit');
  });

  test('reuses the bucket created by a manual quick-add (R7)', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    const manual = await repo.addExtra(userId, dayId, {
      id: uuidv7(),
      name: 'Tortilla chips',
      calories: 150,
    });
    const withDb = await repo.addExtraFromDatabase(userId, dayId, snapshot());

    expect(withDb!.id).toBe(manual!.id);
    expect(withDb!.ingredients).toHaveLength(2);

    const d = drizzle(env.DB);
    const dayMeals = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
    expect(dayMeals.filter((m) => m.origin === 'extra')).toHaveLength(1);
  });

  test('returns null when the day does not belong to the user', async () => {
    await seedUser(env.DB, userId);
    const dayId = await seedDay(env.DB, userId);
    const repo = createMealRepository(env.DB);

    expect(await repo.addExtraFromDatabase('someone-else', dayId, snapshot())).toBeNull();
  });
});
