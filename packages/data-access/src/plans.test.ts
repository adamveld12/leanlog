import { describe, it, expect } from 'vitest';
import { planMaterialization, type MaterializeDayMeal, type MaterializePlanMeal } from './plans';
import type { PlanMealIngredient } from './models';

function ingredient(overrides: Partial<PlanMealIngredient> = {}): PlanMealIngredient {
  return {
    id: 'i1',
    planMealId: 'pm1',
    name: 'Oats',
    weight: 80,
    calories: 300,
    fat: 5,
    saturatedFat: 1,
    carbs: 50,
    fiber: 8,
    protein: 10,
    unsaturatedFat: null,
    monounsaturatedFat: null,
    polyunsaturatedFat: null,
    transFat: null,
    sugar: null,
    sugarAlcohol: null,
    allulose: null,
    alcohol: null,
    calorieSource: 'estimated',
    estimatedCalories: 300,
    micronutrients: null,
    sourceDatabaseIngredientId: null,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

function planMeal(overrides: Partial<MaterializePlanMeal> = {}): MaterializePlanMeal {
  return { name: 'Breakfast', ingredients: [ingredient()], ...overrides };
}

function dayMeal(overrides: Partial<MaterializeDayMeal> = {}): MaterializeDayMeal {
  return { id: 'd1', name: 'Breakfast', logged: false, ingredientCount: 0, ...overrides };
}

describe('planMaterialization', () => {
  it('appends every plan meal when the day has no meals (day creation)', () => {
    const actions = planMaterialization([planMeal(), planMeal({ name: 'Lunch' })], []);
    expect(actions).toEqual([
      { kind: 'append', name: 'Breakfast', ingredients: expect.any(Array) },
      { kind: 'append', name: 'Lunch', ingredients: expect.any(Array) },
    ]);
  });

  it('matches meal names case-insensitively', () => {
    const actions = planMaterialization(
      [planMeal({ name: 'breakfast' })],
      [dayMeal({ id: 'd1', name: 'BREAKFAST' })],
    );
    expect(actions).toEqual([{ kind: 'fill', mealId: 'd1', ingredients: expect.any(Array) }]);
  });

  it('fills an empty, unlogged matching meal', () => {
    const actions = planMaterialization(
      [planMeal()],
      [dayMeal({ ingredientCount: 0, logged: false })],
    );
    expect(actions).toEqual([{ kind: 'fill', mealId: 'd1', ingredients: expect.any(Array) }]);
  });

  it('skips a matching meal that already has ingredients', () => {
    const actions = planMaterialization(
      [planMeal()],
      [dayMeal({ ingredientCount: 2, logged: false })],
    );
    expect(actions).toEqual([{ kind: 'skip', mealId: 'd1', reason: 'has_food' }]);
  });

  it('skips a matching meal that is logged', () => {
    const actions = planMaterialization(
      [planMeal()],
      [dayMeal({ ingredientCount: 0, logged: true })],
    );
    expect(actions).toEqual([{ kind: 'skip', mealId: 'd1', reason: 'logged' }]);
  });

  it('skips for "logged" when a matching meal is both logged and non-empty', () => {
    const actions = planMaterialization(
      [planMeal()],
      [dayMeal({ ingredientCount: 3, logged: true })],
    );
    expect(actions).toEqual([{ kind: 'skip', mealId: 'd1', reason: 'logged' }]);
  });

  it('appends a plan meal with no name match on the day', () => {
    const actions = planMaterialization(
      [planMeal({ name: 'Pre-workout' })],
      [dayMeal({ name: 'Breakfast' })],
    );
    expect(actions).toEqual([
      { kind: 'append', name: 'Pre-workout', ingredients: expect.any(Array) },
    ]);
  });

  it('consumes distinct day meals for duplicate plan-meal names', () => {
    const actions = planMaterialization(
      [planMeal({ name: 'Snack' }), planMeal({ name: 'Snack' })],
      [dayMeal({ id: 'd1', name: 'Snack' }), dayMeal({ id: 'd2', name: 'Snack' })],
    );
    expect(actions).toEqual([
      { kind: 'fill', mealId: 'd1', ingredients: expect.any(Array) },
      { kind: 'fill', mealId: 'd2', ingredients: expect.any(Array) },
    ]);
  });

  it('is idempotent: applying to an already-filled day only skips (R25)', () => {
    const filled = [dayMeal({ ingredientCount: 1, logged: false })];
    const actions = planMaterialization([planMeal()], filled);
    expect(actions).toEqual([{ kind: 'skip', mealId: 'd1', reason: 'has_food' }]);
  });
});
