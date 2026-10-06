import { addDaysIso } from '../calculations';
import type { MobileExport } from '../mobile';

// Shared typed fixture for the mobile domain, repo, and import tests (#75).
// Today is 2026-10-06; yesterday's targets are frozen at 1869 kcal.

const FIRST_DAY = '2026-09-23';
const TODAY = '2026-10-06';
const DAYS = 14;
const START_LB = 182.0;
const END_LB = 180.0;

const NO_MEASUREMENTS = {
  shoulderIn: null,
  waistIn: null,
  bicepIn: null,
  thighIn: null,
  neckIn: null,
  hipIn: null,
};

const KATCH_NO_ACTIVITY = {
  targetCalories: 1869,
  targetFat: 62,
  targetCarbs: 187,
  targetProtein: 140,
  basis: 'katch' as const,
};

const days: MobileExport['days'] = Array.from({ length: DAYS }, (_, i) => {
  const date = addDaysIso(FIRST_DAY, i);
  const weightLbs = Math.round((START_LB + ((END_LB - START_LB) * i) / (DAYS - 1)) * 10) / 10;
  const isToday = date === TODAY;
  const measured = i === 4 || i === 8 || i === 12;
  return {
    date,
    ...(isToday
      ? {
          targetCalories: 2897,
          targetFat: 62,
          targetCarbs: 444,
          targetProtein: 140,
          basis: 'katch' as const,
        }
      : KATCH_NO_ACTIVITY),
    weightLbs,
    weightSource: 'manual' as const,
    weightAt: `${date}T07:10:00.000Z`,
    ...NO_MEASUREMENTS,
    ...(measured ? { shoulderIn: 50, waistIn: 32 } : {}),
  };
});

const yesterday = addDaysIso(TODAY, -1);

const raw: MobileExport = {
  format: 'leanlog-mobile',
  version: 1,
  exportedAt: '2026-10-06T12:00:00.000Z',
  profile: {
    sex: 'male',
    heightIn: 72,
    birthDate: '1991-01-01',
    onboardingWeightLbs: 182,
    activityLevel: 'moderate',
    calorieDelta: 0,
    macroFats: 30,
    macroCarbs: 40,
    macroProtein: 30,
  },
  settings: { units: 'imperial', analyticsOptIn: false, hcEnabled: false },
  days,
  meals: [
    { id: 'meal-breakfast', date: TODAY, name: 'Breakfast', position: 0, revision: 2 },
    { id: 'meal-lunch', date: TODAY, name: 'Lunch', position: 1, revision: 1 },
    { id: 'meal-y-dinner', date: yesterday, name: 'Dinner', position: 0, revision: 1 },
  ],
  ingredients: [
    {
      id: 'ing-oats',
      mealId: 'meal-breakfast',
      name: 'Oats',
      grams: 50,
      calories: 190,
      fat: 3.5,
      saturatedFat: 0.6,
      carbs: 33.5,
      fiber: 5,
      protein: 6.5,
      savedFoodId: 'food-oats',
    },
    {
      id: 'ing-eggs',
      mealId: 'meal-breakfast',
      name: 'Eggs',
      grams: 100,
      calories: 143,
      fat: 9.5,
      saturatedFat: 3.1,
      carbs: 0.7,
      fiber: 0,
      protein: 12.6,
      savedFoodId: 'food-eggs',
    },
    {
      id: 'ing-rice',
      mealId: 'meal-lunch',
      name: 'Rice',
      grams: 200,
      calories: 260,
      fat: 0.6,
      saturatedFat: 0.2,
      carbs: 57,
      fiber: 0.8,
      protein: 5.4,
      savedFoodId: null,
    },
    {
      id: 'ing-y-chicken',
      mealId: 'meal-y-dinner',
      name: 'Chicken',
      grams: 150,
      calories: 248,
      fat: 5.4,
      saturatedFat: 1.5,
      carbs: 0,
      fiber: 0,
      protein: 46.5,
      savedFoodId: null,
    },
  ],
  savedFoods: [
    {
      id: 'food-oats',
      name: 'Oats',
      referenceGrams: 100,
      calories: 380,
      fat: 7,
      saturatedFat: 1.2,
      carbs: 67,
      fiber: 10,
      protein: 13,
      createdAt: '2026-09-23T08:00:00.000Z',
      updatedAt: '2026-09-23T08:00:00.000Z',
    },
    {
      id: 'food-eggs',
      name: 'Eggs',
      referenceGrams: 100,
      calories: 143,
      fat: 9.5,
      saturatedFat: 3.1,
      carbs: 0.7,
      fiber: 0,
      protein: 12.6,
      createdAt: '2026-09-23T08:00:00.000Z',
      updatedAt: '2026-09-23T08:00:00.000Z',
    },
  ],
  bodyFatResults: [
    {
      id: 'bf-1',
      date: '2026-09-23',
      pct: 15,
      method: 'navy',
      inputs: { heightIn: 72, neckIn: 15, waistIn: 32 },
    },
  ],
  errorLog: [],
};

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Canonical row order, matching what the mobile repositories export:
// meals by date then position, ingredients by meal then id, foods by id.
export const mobileSampleExport: MobileExport = {
  ...raw,
  meals: [...raw.meals].sort((a, b) => cmp(a.date, b.date) || a.position - b.position),
  ingredients: [...raw.ingredients].sort((a, b) => cmp(a.mealId, b.mealId) || cmp(a.id, b.id)),
  savedFoods: [...raw.savedFoods].sort((a, b) => cmp(a.id, b.id)),
};
