import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { createMealRepository } from './meals';
import { userProfiles, dailyMealLogs, meals, ingredients } from '../schema';
import { TemplateMealNotDeletableError } from '@leanlog/data-access';

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
