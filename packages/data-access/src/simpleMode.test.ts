import { describe, expect, test } from 'vitest';
import {
  canAddAdhocMeal,
  findSectionMeal,
  groupDayIntoSections,
  lastNDays,
  sectionForMeal,
  weekAverage,
} from './simpleMode';
import type { DailyMealLog, Ingredient, Meal } from './models';

// Local-time instants keep the hour-based fallback independent of the test
// runner's timezone.
const at = (hour: number, minute = 0) => new Date(2026, 9, 7, hour, minute).toISOString();

function makeIngredient(partial: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'i',
    mealId: 'm',
    name: 'FOOD',
    weight: 100,
    calories: 100,
    fat: 1,
    saturatedFat: 0,
    carbs: 2,
    fiber: 0,
    protein: 3,
    calorieSource: 'explicit',
    estimatedCalories: 0,
    createdAt: at(12),
    updatedAt: at(12),
    ...partial,
  };
}

function makeMeal(partial: Partial<Meal> = {}): Meal {
  return {
    id: 'm',
    dailyMealLogId: 'd',
    name: 'Meal',
    origin: 'adhoc',
    logged: false,
    ingredients: [],
    createdAt: at(8),
    updatedAt: at(8),
    ...partial,
  };
}

function makeDay(meals: Meal[], partial: Partial<DailyMealLog> = {}): DailyMealLog {
  return {
    id: 'd',
    userId: 'u',
    date: '2026-10-07',
    targetCalories: 2000,
    targetFat: 70,
    targetCarbs: 250,
    targetProtein: 140,
    mealCountTarget: 0,
    weightLbs: null,
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
    objectivesCompletedAt: null,
    meals,
    createdAt: at(7),
    updatedAt: at(7),
    ...partial,
  };
}

describe('sectionForMeal', () => {
  test.each([
    ['Breakfast', 'breakfast'],
    ['  lunch ', 'lunch'],
    ['DINNER', 'dinner'],
    ['Supper', 'dinner'],
    ['Snacks', 'snacks'],
    ['snack', 'snacks'],
  ] as const)('a meal named %j goes under %s', (name, section) => {
    expect(sectionForMeal(makeMeal({ name }))).toBe(section);
  });

  test('the Extras bucket goes under Snacks whatever its name', () => {
    expect(sectionForMeal(makeMeal({ name: 'Breakfast', origin: 'extra' }))).toBe('snacks');
  });

  test.each([
    [10, 59, 'breakfast'],
    [11, 0, 'lunch'],
    [15, 59, 'lunch'],
    [16, 0, 'dinner'],
    [20, 59, 'dinner'],
    [21, 0, 'snacks'],
    [2, 0, 'breakfast'],
    [23, 30, 'snacks'],
  ] as const)(
    'an unmatched meal whose first food was logged at %i:%i goes under %s',
    (hour, minute, section) => {
      const meal = makeMeal({
        name: 'Meal 2',
        ingredients: [
          makeIngredient({ id: 'late', createdAt: at(23) }),
          makeIngredient({ id: 'first', createdAt: at(hour, minute) }),
        ],
      });
      expect(sectionForMeal(meal)).toBe(section);
    },
  );

  test('an unmatched meal with no food falls back to when the meal was created', () => {
    expect(sectionForMeal(makeMeal({ name: 'Pre-workout', createdAt: at(17) }))).toBe('dinner');
  });
});

describe('groupDayIntoSections', () => {
  test('always returns the four sections in order, empty when nothing was eaten', () => {
    const sections = groupDayIntoSections(makeDay([]));
    expect(sections.map((s) => [s.key, s.label, s.entries.length])).toEqual([
      ['breakfast', 'Breakfast', 0],
      ['lunch', 'Lunch', 0],
      ['dinner', 'Dinner', 0],
      ['snacks', 'Snacks', 0],
    ]);
  });

  test('each section lists its foods and sums calories and P/C/F', () => {
    const lunch = makeMeal({
      id: 'lunch',
      name: 'Lunch',
      ingredients: [
        makeIngredient({
          id: 'a',
          mealId: 'lunch',
          calories: 300,
          protein: 30,
          carbs: 20,
          fat: 10,
        }),
        makeIngredient({ id: 'b', mealId: 'lunch', calories: 100, protein: 5, carbs: 10, fat: 2 }),
      ],
    });
    const section = groupDayIntoSections(makeDay([lunch]))[1]!;
    expect(section.entries.map((e) => e.ingredient.id)).toEqual(['a', 'b']);
    expect(section.totals).toEqual({ calories: 400, protein: 35, carbs: 30, fat: 12 });
  });

  test("only the section's own ad-hoc meal is editable; Extras and other meals are read-only", () => {
    const snacks = makeMeal({
      id: 'snacks',
      name: 'Snacks',
      ingredients: [makeIngredient({ id: 'own', mealId: 'snacks' })],
    });
    const extras = makeMeal({
      id: 'extras',
      name: 'Extras',
      origin: 'extra',
      ingredients: [makeIngredient({ id: 'extra', mealId: 'extras' })],
    });
    const section = groupDayIntoSections(makeDay([snacks, extras]))[3]!;
    expect(section.entries.map((e) => [e.ingredient.id, e.mealId, e.editable])).toEqual([
      ['own', 'snacks', true],
      ['extra', 'extras', false],
    ]);
  });

  test('unlogged plan meals are hidden because they do not count toward totals', () => {
    const planned = makeMeal({
      name: 'Lunch',
      origin: 'template',
      logged: false,
      ingredients: [makeIngredient({ calories: 500 })],
    });
    const logged = makeMeal({
      id: 'logged',
      name: 'Dinner',
      origin: 'template',
      logged: true,
      ingredients: [makeIngredient({ id: 'x', mealId: 'logged', calories: 250 })],
    });
    const sections = groupDayIntoSections(makeDay([planned, logged]));
    expect(sections[1]!.entries).toEqual([]);
    expect(sections[2]!.totals.calories).toBe(250);
    expect(sections[2]!.entries[0]!.editable).toBe(false);
  });
});

describe('findSectionMeal', () => {
  test("finds the section's ad-hoc meal by name, ignoring case and whitespace", () => {
    const lunch = makeMeal({ id: 'l', name: ' lunch ' });
    expect(findSectionMeal(makeDay([lunch]), 'lunch')?.id).toBe('l');
  });

  test('ignores plan meals and the Extras bucket so simple mode never writes into them', () => {
    const plan = makeMeal({ id: 'p', name: 'Lunch', origin: 'template' });
    const extras = makeMeal({ id: 'e', name: 'Snacks', origin: 'extra' });
    const day = makeDay([plan, extras]);
    expect(findSectionMeal(day, 'lunch')).toBeUndefined();
    expect(findSectionMeal(day, 'snacks')).toBeUndefined();
  });
});

describe('lastNDays', () => {
  test('returns exactly n dates ending today, oldest first, with null for unlogged days', () => {
    const logged = [
      makeDay([], { id: 'a', date: '2026-10-05' }),
      makeDay([], { id: 'b', date: '2026-10-07' }),
    ];
    const window = lastNDays(logged, '2026-10-07', 7);
    expect(window.map((w) => w.date)).toEqual([
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
    ]);
    expect(window.map((w) => w.day?.id ?? null)).toEqual([null, null, null, null, 'a', null, 'b']);
  });

  test('crosses a month boundary and ignores days outside the window', () => {
    const days = [
      makeDay([], { id: 'old', date: '2026-09-24' }),
      makeDay([], { id: 'in', date: '2026-09-28' }),
      makeDay([], { id: 'future', date: '2026-10-04' }),
    ];
    const window = lastNDays(days, '2026-10-02', 7);
    expect(window[0]!.date).toBe('2026-09-26');
    expect(window.filter((w) => w.day).map((w) => w.day!.id)).toEqual(['in']);
  });
});

describe('weekAverage', () => {
  test('divides the week total by the window length, so unlogged days count as zero', () => {
    const totals = [
      { calories: 2000, protein: 140, carbs: 200, fat: 70 },
      { calories: 1500, protein: 70, carbs: 150, fat: 35 },
    ];
    expect(weekAverage(totals, 7)).toEqual({ calories: 500, protein: 30, carbs: 50, fat: 15 });
  });

  test('is all zeros for an empty week', () => {
    expect(weekAverage([], 7)).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
});

describe('canAddAdhocMeal', () => {
  const plan = makeMeal({ id: 'p', name: 'Meal 1', origin: 'template' });

  test('any ad-hoc meal is allowed on a day without plan meals', () => {
    expect(canAddAdhocMeal(makeDay([]), 'Second breakfast')).toBe(true);
  });

  test('a simple-mode section meal is allowed on a plan day so simple mode can log food there', () => {
    for (const name of ['Breakfast', 'Lunch', 'Dinner', 'Snacks']) {
      expect(canAddAdhocMeal(makeDay([plan]), name)).toBe(true);
    }
  });

  test('other ad-hoc meals are still refused on a plan day', () => {
    expect(canAddAdhocMeal(makeDay([plan]), 'Pre-workout')).toBe(false);
    expect(canAddAdhocMeal(makeDay([plan]), '')).toBe(false);
  });
});
