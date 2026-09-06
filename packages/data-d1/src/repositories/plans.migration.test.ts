import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
// Vite `?raw` import: always the exact, currently-shipped migration text, so
// this test can never drift from what actually runs in production.
import backfillSql from '../../drizzle/0012_plans_backfill.sql?raw';
import {
  userProfiles,
  goals,
  mealTemplates,
  mealTemplateIngredients,
  plans,
  planMeals,
  planMealIngredients,
} from '../schema';

// The full 0000-0012 migration chain (including this exact 0012 file) has
// already run once against an empty database in the global test setup
// (test/setup.ts beforeAll), so it produced no plans. Each test here seeds
// legacy-shape rows for a unique user and then replays 0012 verbatim — this
// is the only way to test R34/R35's preservation guarantees against the D1
// harness, which always applies every migration before any test-level data
// exists (see packages/data-d1/AGENTS.md-adjacent note in the implementation
// plan for issue #84).
// D1's exec() treats every newline as a statement boundary, which breaks on
// this file's comment lines. Strip comments and split on `;` instead, then
// run each statement individually.
function splitStatements(sql: string): string[] {
  const withoutComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  return withoutComments
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function replayBackfill() {
  for (const statement of splitStatements(backfillSql)) {
    await env.DB.prepare(statement).run();
  }
}

const ts = () => new Date().toISOString();

async function seedUser(clerkUserId: string) {
  const d = drizzle(env.DB);
  await d
    .insert(userProfiles)
    .values({ id: uuidv7(), clerkUserId, createdAt: ts(), updatedAt: ts() });
}

function slotsJson(names: string[]): string {
  return JSON.stringify(names.map((name) => ({ name, ingredients: [] })));
}

async function seedGoal(
  userId: string,
  slots: string[],
  overrides: Partial<typeof goals.$inferInsert> = {},
) {
  const d = drizzle(env.DB);
  const id = uuidv7();
  await d.insert(goals).values({
    id,
    userId,
    isBackground: true,
    mode: 'maintain',
    startDate: null,
    endDate: null,
    mealSlotsJson: slotsJson(slots),
    createdAt: ts(),
    updatedAt: ts(),
    ...overrides,
  });
  return id;
}

async function seedTemplate(userId: string, name: string, withIngredient: boolean) {
  const d = drizzle(env.DB);
  const id = uuidv7();
  await d
    .insert(mealTemplates)
    .values({ id, userId, name, position: 0, createdAt: ts(), updatedAt: ts() });
  if (withIngredient) {
    await d.insert(mealTemplateIngredients).values({
      id: uuidv7(),
      templateId: id,
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

describe('0012_plans_backfill migration', () => {
  // Each test replays the whole-table backfill script, which is only correct
  // to run once against production data. Clear every row it reads or writes
  // before each test so a replay only ever sees that test's own seed data.
  beforeEach(async () => {
    const d = drizzle(env.DB);
    // goals.default_plan_id references plans, so goals must go first.
    await d.delete(goals);
    await d.delete(planMealIngredients);
    await d.delete(planMeals);
    await d.delete(plans);
    await d.delete(mealTemplateIngredients);
    await d.delete(mealTemplates);
  });

  test('two goals with byte-identical slots collapse into one plan (R35)', async () => {
    const userId = `mig-user-${uuidv7()}`;
    await seedUser(userId);
    const slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
    const goalA = await seedGoal(userId, slots);
    const goalB = await seedGoal(userId, slots, { isBackground: false, startDate: '2026-01-01' });

    await replayBackfill();

    const d = drizzle(env.DB);
    const userPlans = await d.select().from(plans).where(eq(plans.userId, userId));
    expect(userPlans).toHaveLength(1);
    expect(userPlans[0].name).toBe('Default');

    const meals = await d.select().from(planMeals).where(eq(planMeals.planId, userPlans[0].id));
    expect(meals.map((m) => m.name)).toEqual(slots);

    const goalRows = await d.select().from(goals).where(eq(goals.userId, userId));
    for (const g of goalRows) {
      expect(g.defaultPlanId).toBe(userPlans[0].id);
    }
    expect(goalRows.map((g) => g.id).sort()).toEqual([goalA, goalB].sort());
  });

  test('two goals with distinct slot lists for the same user become two uniquely-named plans (R6/R35)', async () => {
    const userId = `mig-user-${uuidv7()}`;
    await seedUser(userId);
    await seedGoal(userId, ['Breakfast', 'Lunch']);
    await seedGoal(userId, ['Meal 1', 'Meal 2', 'Meal 3'], {
      isBackground: false,
      startDate: '2026-01-01',
    });

    await replayBackfill();

    const d = drizzle(env.DB);
    const userPlans = await d.select().from(plans).where(eq(plans.userId, userId));
    expect(userPlans).toHaveLength(2);
    expect(userPlans.map((p) => p.name).sort()).toEqual(['Default', 'Default 2']);

    const goalRows = await d.select().from(goals).where(eq(goals.userId, userId));
    const planIds = new Set(goalRows.map((g) => g.defaultPlanId));
    expect(planIds.size).toBe(2);
  });

  test('a meal template with an ingredient is preserved into a "Saved meals" plan, keeping ids (R34)', async () => {
    const userId = `mig-user-${uuidv7()}`;
    await seedUser(userId);
    const templateId = await seedTemplate(userId, 'My favorite breakfast', true);

    await replayBackfill();

    const d = drizzle(env.DB);
    const userPlans = await d.select().from(plans).where(eq(plans.userId, userId));
    const savedMeals = userPlans.find((p) => p.name === 'Saved meals');
    expect(savedMeals).toBeDefined();

    const meals = await d.select().from(planMeals).where(eq(planMeals.planId, savedMeals!.id));
    expect(meals).toHaveLength(1);
    // Reusing the template's id as the plan meal's id (R34 implementation detail).
    expect(meals[0].id).toBe(templateId);
    expect(meals[0].name).toBe('My favorite breakfast');

    const ing = await d
      .select()
      .from(planMealIngredients)
      .where(eq(planMealIngredients.planMealId, templateId));
    expect(ing).toHaveLength(1);
    expect(ing[0].name).toBe('Oats');
  });

  test('a seeded, never-touched empty template is discarded, not preserved (R34)', async () => {
    const userId = `mig-user-${uuidv7()}`;
    await seedUser(userId);
    await seedTemplate(userId, 'Breakfast', false);
    await seedTemplate(userId, 'Lunch', false);

    await replayBackfill();

    const d = drizzle(env.DB);
    const userPlans = await d.select().from(plans).where(eq(plans.userId, userId));
    expect(userPlans.find((p) => p.name === 'Saved meals')).toBeUndefined();
  });
});
