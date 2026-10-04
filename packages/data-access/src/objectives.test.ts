import { describe, it, expect } from 'vitest';
import { dayObjectives, isMeaningfulMeal } from './objectives';
import type { DailyMealLog, Ingredient, Meal } from './models';

const TS = '2026-06-11T12:00:00.000Z';

function ingredient(partial: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'i',
    mealId: 'm',
    name: 'Food',
    weight: 100,
    calories: 0,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
    protein: 0,
    calorieSource: 'explicit',
    estimatedCalories: 0,
    createdAt: TS,
    updatedAt: TS,
    ...partial,
  };
}

function meal(partial: Partial<Meal> = {}): Meal {
  return {
    id: 'm',
    dailyMealLogId: 'd',
    name: 'Meal',
    origin: 'adhoc',
    logged: false,
    ingredients: [],
    createdAt: TS,
    updatedAt: TS,
    ...partial,
  };
}

function day(partial: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'd',
    userId: 'u',
    date: '2026-06-11',
    targetCalories: 2000,
    targetFat: 60,
    targetCarbs: 200,
    targetProtein: 150,
    mealCountTarget: 0,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    meals: [],
    createdAt: TS,
    updatedAt: TS,
    ...partial,
  };
}

describe('isMeaningfulMeal', () => {
  it('an empty meal is not meaningful', () => {
    expect(isMeaningfulMeal(meal())).toBe(false);
  });

  it('an ad-hoc meal with a non-zero-calorie ingredient is meaningful', () => {
    expect(isMeaningfulMeal(meal({ ingredients: [ingredient({ calories: 250 })] }))).toBe(true);
  });

  it('an ingredient with zero calories does not make a meal meaningful', () => {
    expect(isMeaningfulMeal(meal({ ingredients: [ingredient({ calories: 0 })] }))).toBe(false);
  });

  // D1: plan-copied meals arrive pre-filled but unlogged — they must be Logged
  // to count, or a fresh plan day would read "4/4 meals eaten".
  it('an unlogged plan-copied meal is not meaningful even with plan ingredients', () => {
    const planMeal = meal({
      origin: 'template',
      logged: false,
      ingredients: [ingredient({ calories: 400 })],
    });
    expect(isMeaningfulMeal(planMeal)).toBe(false);
  });

  it('a logged plan-copied meal with food is meaningful', () => {
    const planMeal = meal({
      origin: 'template',
      logged: true,
      ingredients: [ingredient({ calories: 400 })],
    });
    expect(isMeaningfulMeal(planMeal)).toBe(true);
  });

  // #64 R4: the Extras bucket is not a meal, even when it holds food.
  it('the Extras bucket is never a meaningful meal', () => {
    const extras = meal({ origin: 'extra', ingredients: [ingredient({ calories: 150 })] });
    expect(isMeaningfulMeal(extras)).toBe(false);
  });
});

describe('dayObjectives — weight', () => {
  it('is incomplete until a weight is logged', () => {
    expect(dayObjectives(day({ weightLbs: null })).weight).toEqual({
      complete: false,
      weightLbs: null,
    });
  });

  it('is complete once a weight is logged', () => {
    expect(dayObjectives(day({ weightLbs: 182.5 })).weight).toEqual({
      complete: true,
      weightLbs: 182.5,
    });
  });
});

describe('dayObjectives — meals', () => {
  const fed = (id: string, partial: Partial<Meal> = {}) =>
    meal({
      id,
      origin: 'template',
      logged: true,
      ingredients: [ingredient({ id: `i-${id}`, mealId: id, calories: 400 })],
      ...partial,
    });

  it('counts meaningful meals against the plan-backed meal count', () => {
    const d = day({
      meals: [
        fed('a'),
        meal({ id: 'b', origin: 'template' }),
        meal({ id: 'c', origin: 'template' }),
        meal({ id: 'd2', origin: 'template' }),
      ],
    });
    expect(dayObjectives(d).meals).toEqual({ complete: false, eaten: 1, target: 4 });
  });

  it('is complete once every expected meal is meaningful', () => {
    const d = day({ meals: [fed('a'), fed('b'), fed('c'), fed('d2')] });
    expect(dayObjectives(d).meals).toEqual({ complete: true, eaten: 4, target: 4 });
  });

  it('an empty meal never advances progress', () => {
    const d = day({
      mealCountTarget: 4,
      meals: [meal({ id: 'a' })],
    });
    expect(dayObjectives(d).meals.eaten).toBe(0);
  });

  // dayMealStructure reports expected = 0 for an empty zero-template day; a
  // naive eaten >= target would call that complete.
  it('a day with no expected meals is never complete', () => {
    expect(dayObjectives(day()).meals).toEqual({ complete: false, eaten: 0, target: 0 });
  });
});

describe('dayObjectives — macros', () => {
  // One logged plan meal carrying exact macros, so targets 150P / 200C / 60F
  // can be hit, missed, or sat on the ±10% boundary precisely.
  const withMacros = (macros: { protein: number; carbs: number; fat: number; calories?: number }) =>
    day({
      meals: [
        meal({
          id: 'm1',
          ingredients: [ingredient({ calories: macros.calories ?? 1800, ...macros })],
        }),
      ],
    });

  it('is complete when protein, carbs and fat are each within 10% of target', () => {
    const o = dayObjectives(withMacros({ protein: 150, carbs: 200, fat: 60 })).macros;
    expect(o.complete).toBe(true);
    expect(o.protein).toEqual({ actual: 150, target: 150, complete: true });
  });

  it('treats exactly ±10% as inside the range (inclusive)', () => {
    expect(dayObjectives(withMacros({ protein: 165, carbs: 180, fat: 66 })).macros.complete).toBe(
      true,
    );
    expect(dayObjectives(withMacros({ protein: 135, carbs: 220, fat: 54 })).macros.complete).toBe(
      true,
    );
  });

  it('is incomplete when any one macro falls outside 10%', () => {
    const o = dayObjectives(withMacros({ protein: 150, carbs: 200, fat: 40 })).macros;
    expect(o.fat.complete).toBe(false);
    expect(o.complete).toBe(false);
  });

  // D2: ±10% is two-sided — overshooting fails just like undershooting.
  it('overshooting a macro by more than 10% fails the objective', () => {
    const o = dayObjectives(withMacros({ protein: 250, carbs: 200, fat: 60 })).macros;
    expect(o.protein.complete).toBe(false);
    expect(o.complete).toBe(false);
  });

  it('calories are reported but never gate macro completion', () => {
    const o = dayObjectives(
      withMacros({ protein: 150, carbs: 200, fat: 60, calories: 1000 }),
    ).macros;
    expect(o.calories).toEqual({ actual: 1000, target: 2000, complete: false });
    expect(o.complete).toBe(true);
  });

  it('a zero macro target is never complete (no divide-by-zero pass)', () => {
    const o = dayObjectives({
      ...withMacros({ protein: 0, carbs: 200, fat: 60 }),
      targetProtein: 0,
    }).macros;
    expect(o.protein.complete).toBe(false);
    expect(o.complete).toBe(false);
  });

  it('counts the Extras bucket toward macro totals, as day totals do', () => {
    const d = day({
      meals: [
        meal({
          id: 'm1',
          ingredients: [ingredient({ calories: 1500, protein: 100, carbs: 200, fat: 60 })],
        }),
        meal({
          id: 'x',
          origin: 'extra',
          ingredients: [ingredient({ calories: 200, protein: 50 })],
        }),
      ],
    });
    expect(dayObjectives(d).macros.protein.actual).toBe(150);
  });
});

describe('dayObjectives — allComplete', () => {
  const fedMeal = (id: string, m: { protein: number; carbs: number; fat: number }) =>
    meal({
      id,
      origin: 'template',
      logged: true,
      ingredients: [ingredient({ id: `i-${id}`, mealId: id, calories: 500, ...m })],
    });
  // 4 plan meals; each ~1/4 of the 150P / 200C / 60F targets.
  const fourMeals = () => [
    fedMeal('a', { protein: 37.5, carbs: 50, fat: 15 }),
    fedMeal('b', { protein: 37.5, carbs: 50, fat: 15 }),
    fedMeal('c', { protein: 37.5, carbs: 50, fat: 15 }),
    fedMeal('d', { protein: 37.5, carbs: 50, fat: 15 }),
  ];

  it('needs weight, the meal target, and the three macros', () => {
    expect(dayObjectives(day({ weightLbs: 182.5, meals: fourMeals() })).allComplete).toBe(true);
  });

  it('is false without a logged weight', () => {
    expect(dayObjectives(day({ weightLbs: null, meals: fourMeals() })).allComplete).toBe(false);
  });

  it('is false when macros are right but meals are short of target', () => {
    const [a, b, c] = fourMeals();
    const d = day({
      weightLbs: 180,
      meals: [a!, b!, c!, meal({ id: 'd', origin: 'template' })],
    });
    expect(dayObjectives(d).meals.complete).toBe(false);
    expect(dayObjectives(d).allComplete).toBe(false);
  });

  it('calories outside 10% do not block completion', () => {
    const d = day({ weightLbs: 180, targetCalories: 5000, meals: fourMeals() });
    expect(dayObjectives(d).macros.calories.complete).toBe(false);
    expect(dayObjectives(d).allComplete).toBe(true);
  });
});
