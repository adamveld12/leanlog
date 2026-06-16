import { describe, it, expect } from 'vitest';
import {
  caloriesFromMode,
  macrosFromPercentage,
  dayTargetsFromProfile,
  macroAccuracy,
  trackingCoverage,
  estimatedWeightLost,
  weightLossCertainty,
  estimateCalories,
  scaleLabelToIngredient,
} from './calculations';
import type { UserProfile, NutritionDatabaseIngredient } from './models';

const baseProfile: UserProfile = {
  id: 'test-id',
  clerkUserId: 'clerk-test',
  weightLbs: 180,
  heightInches: 72,
  calorieMode: 'maintenance',
  targetCalories: null,
  macroMode: 'percentage',
  macroFats: 25,
  macroCarbs: 35,
  macroProtein: 40,
  goalWeightLbs: null,
  goalBodyFatPct: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('caloriesFromMode', () => {
  it('returns deficit calories for weight 180', () => {
    expect(caloriesFromMode(180, 'deficit')).toBe(1800);
  });

  it('returns maintenance calories for weight 180', () => {
    expect(caloriesFromMode(180, 'maintenance')).toBe(2700);
  });

  it('returns surplus calories for weight 180', () => {
    expect(caloriesFromMode(180, 'surplus')).toBe(2880);
  });

  it('returns null for weight < 90', () => {
    expect(caloriesFromMode(89, 'maintenance')).toBeNull();
    expect(caloriesFromMode(0, 'deficit')).toBeNull();
  });

  it('returns value for weight exactly 90', () => {
    expect(caloriesFromMode(90, 'maintenance')).toBe(1350);
  });
});

describe('macrosFromPercentage', () => {
  it('calculates macros from 2700 calories with 25/35/40 split', () => {
    const result = macrosFromPercentage(2700, 25, 35, 40);
    // Fat: 2700 * 0.25 / 9 = 75
    expect(result.targetFat).toBe(75);
    // Carbs: 2700 * 0.35 / 4 = 236.25 -> 236
    expect(result.targetCarbs).toBe(236);
    // Protein: 2700 * 0.40 / 4 = 270
    expect(result.targetProtein).toBe(270);
  });

  it('handles zero calories', () => {
    const result = macrosFromPercentage(0, 25, 35, 40);
    expect(result.targetFat).toBe(0);
    expect(result.targetCarbs).toBe(0);
    expect(result.targetProtein).toBe(0);
  });
});

describe('dayTargetsFromProfile', () => {
  it('calculates targets from percentage mode with default profile', () => {
    const result = dayTargetsFromProfile(baseProfile);
    expect(result.targetCalories).toBe(2700);
    expect(result.targetFat).toBe(75);
    expect(result.targetCarbs).toBe(236);
    expect(result.targetProtein).toBe(270);
  });

  it('uses custom macros when macroMode is custom', () => {
    const profile: UserProfile = {
      ...baseProfile,
      macroMode: 'custom',
      macroFats: 80,
      macroCarbs: 200,
      macroProtein: 160,
    };
    const result = dayTargetsFromProfile(profile);
    expect(result.targetCalories).toBe(2700);
    expect(result.targetFat).toBe(80);
    expect(result.targetCarbs).toBe(200);
    expect(result.targetProtein).toBe(160);
  });

  it('uses custom calorie target when calorieMode is custom', () => {
    const profile: UserProfile = {
      ...baseProfile,
      calorieMode: 'custom',
      targetCalories: 2000,
    };
    const result = dayTargetsFromProfile(profile);
    expect(result.targetCalories).toBe(2000);
  });

  it('returns 0 for targetCalories when custom mode has null targetCalories', () => {
    const profile: UserProfile = {
      ...baseProfile,
      calorieMode: 'custom',
      targetCalories: null,
    };
    const result = dayTargetsFromProfile(profile);
    expect(result.targetCalories).toBe(0);
  });
});

describe('macroAccuracy', () => {
  it('returns 100 when actual equals target', () => {
    expect(macroAccuracy(2000, 2000)).toBe(100);
  });

  it('returns 80 when 20% over target', () => {
    expect(macroAccuracy(2400, 2000)).toBe(80);
  });

  it('returns 80 when 20% under target', () => {
    expect(macroAccuracy(1600, 2000)).toBe(80);
  });

  it('returns 0 when target is 0', () => {
    expect(macroAccuracy(100, 0)).toBe(0);
  });

  it('returns 0 when actual is 0 and target is positive', () => {
    expect(macroAccuracy(0, 2000)).toBe(0);
  });

  it('clamps to 0 when overshoot exceeds 100%', () => {
    expect(macroAccuracy(4500, 2000)).toBe(0);
  });
});

describe('trackingCoverage', () => {
  it('returns 75 for 3/4 meals', () => {
    expect(trackingCoverage(3, 4)).toBe(75);
  });

  it('returns 100 for full coverage', () => {
    expect(trackingCoverage(4, 4)).toBe(100);
  });

  it('returns 0 when expected is 0', () => {
    expect(trackingCoverage(0, 0)).toBe(0);
  });

  it('clamps at 100 when meals exceed target', () => {
    expect(trackingCoverage(5, 3)).toBe(100);
  });
});

describe('estimatedWeightLost', () => {
  it('returns 1.0 lb for 3000 kcal deficit', () => {
    expect(estimatedWeightLost(15000, 18000)).toBe(1);
  });

  it('returns 0 when in surplus', () => {
    expect(estimatedWeightLost(20000, 18000)).toBe(0);
  });

  it('returns 0 when at maintenance', () => {
    expect(estimatedWeightLost(18000, 18000)).toBe(0);
  });
});

describe('weightLossCertainty', () => {
  it('returns 80 for 100% coverage', () => {
    expect(weightLossCertainty(100)).toBe(80);
  });

  it('returns 40 for 50% coverage', () => {
    expect(weightLossCertainty(50)).toBe(40);
  });

  it('caps at 80', () => {
    expect(weightLossCertainty(150)).toBe(80);
  });
});

describe('estimateCalories', () => {
  it('AE1: fiber deduction — fat0 protein0 carbs20 fiber5 -> 70', () => {
    // digestible = 20-5 = 15, fiber = 5*2=10, total = 15*4 + 10 = 60+10 = 70
    expect(estimateCalories({ fat: 0, carbs: 20, protein: 0, fiber: 5 })).toBe(70);
  });

  it('AE2: fat+protein+fiber+SA — fat9 protein10 carbs20 fiber8 SA4 -> 178.6', () => {
    // fat:9*9=81, protein:10*4=40, digestible:(20-8-4=8)*4=32, fiber:8*2=16, SA:4*2.4=9.6
    // total = 81+40+32+16+9.6 = 178.6
    expect(estimateCalories({ fat: 9, protein: 10, carbs: 20, fiber: 8, sugarAlcohol: 4 })).toBe(
      178.6,
    );
  });

  it('missing contributors default to 0 — fat10 carbs30 protein20 -> 290', () => {
    // fat10*9=90, protein20*4=80, digestible30*4=120 => 290
    expect(estimateCalories({ fat: 10, carbs: 30, protein: 20 })).toBe(290);
  });

  it('over-clamp: fiber and SA exceed carbs — clamp to available carbs', () => {
    // fiber clamped to 20 (carbs), SA clamped to 0 (20-20=0 remaining), digestible=0
    // total = 20*2 = 40
    expect(estimateCalories({ fat: 0, carbs: 20, protein: 0, fiber: 25, sugarAlcohol: 10 })).toBe(
      40,
    );
  });

  it('allulose factor — fat0 carbs10 protein0 allulose10 -> 4', () => {
    // allulose clamped to 10, digestible=0; total = 10*0.4 = 4
    expect(estimateCalories({ fat: 0, carbs: 10, protein: 0, allulose: 10 })).toBe(4);
  });

  it('alcohol only — fat0 carbs0 protein0 alcohol10 -> 70', () => {
    // 10*7 = 70
    expect(estimateCalories({ fat: 0, carbs: 0, protein: 0, alcohol: 10 })).toBe(70);
  });

  it('rounds to 1 decimal — fat1.1 carbs1.1 protein1.1 -> 18.7', () => {
    // 1.1*9=9.9 + 1.1*4=4.4 + 1.1*4=4.4 = 18.7
    expect(estimateCalories({ fat: 1.1, carbs: 1.1, protein: 1.1 })).toBe(18.7);
  });
});

const baseDbIngredient: NutritionDatabaseIngredient = {
  id: '01939f68-0000-7000-8000-000000000001',
  name: 'Chicken Breast',
  servingAmount: 170,
  servingSizeUnit: 'gram',
  servingSizeDisplayText: null,
  servingsPerPackage: 2,
  addedByUserId: 'user-1',
  creationSource: 'manual',
  fat: 3.6,
  carbs: 0,
  protein: 31,
  calories: 156.4,
  saturatedFat: 1,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  fiber: 0,
  sugar: null,
  addedSugars: null,
  sugarAlcohol: null,
  allulose: null,
  alcohol: null,
  micronutrients: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('scaleLabelToIngredient — weight mode', () => {
  it('doubles all fields when consumed weight is 2x serving', () => {
    const result = scaleLabelToIngredient(baseDbIngredient, { mode: 'weight', amount: 340 });
    expect(result.calories).toBe(312.8);
    expect(result.fat).toBe(7.2);
    expect(result.carbs).toBe(0);
    expect(result.protein).toBe(62);
    expect(result.weight).toBe(340);
    expect(result.saturatedFat).toBe(2);
    expect(result.sourceDatabaseIngredientId).toBe(baseDbIngredient.id);
  });

  it('only scales present optional fields, leaves absent ones absent', () => {
    const result = scaleLabelToIngredient(baseDbIngredient, { mode: 'weight', amount: 340 });
    expect(result.unsaturatedFat).toBeUndefined();
    expect(result.monounsaturatedFat).toBeUndefined();
    expect(result.transFat).toBeUndefined();
    expect(result.sugar).toBeUndefined();
    expect(result.sugarAlcohol).toBeUndefined();
    expect(result.allulose).toBeUndefined();
    expect(result.alcohol).toBeUndefined();
  });

  it('scales sugarAlcohol, allulose, and alcohol when present', () => {
    const ingredient: NutritionDatabaseIngredient = {
      ...baseDbIngredient,
      sugarAlcohol: 4,
      allulose: 2,
      alcohol: 1,
    };
    const result = scaleLabelToIngredient(ingredient, { mode: 'weight', amount: 340 });
    expect(result.sugarAlcohol).toBe(8);
    expect(result.allulose).toBe(4);
    expect(result.alcohol).toBe(2);
  });

  it('scales typed micronutrient amounts and drops %DV (R4)', () => {
    const ingredient: NutritionDatabaseIngredient = {
      ...baseDbIngredient,
      micronutrients: [
        { name: 'Iron', amount: 2, unit: 'milligram' },
        { name: 'Vitamin C', amount: 5, unit: 'milligram' },
      ],
    };
    const result = scaleLabelToIngredient(ingredient, { mode: 'weight', amount: 340 });
    expect(result.micronutrients).toHaveLength(2);
    expect(result.micronutrients![0]).toEqual({ name: 'Iron', amount: 4, unit: 'milligram' });
    expect(result.micronutrients![1]).toEqual({ name: 'Vitamin C', amount: 10, unit: 'milligram' });
    expect(result.micronutrients![0]).not.toHaveProperty('percentDailyValue');
  });

  it('half serving scales down correctly', () => {
    const result = scaleLabelToIngredient(baseDbIngredient, { mode: 'weight', amount: 85 });
    expect(result.fat).toBe(1.8);
    expect(result.protein).toBe(15.5);
    expect(result.weight).toBe(85);
  });
});

describe('scaleLabelToIngredient — servings & package modes', () => {
  it('AE6: 2 servings keeps the source reference and scales macros by serving count', () => {
    const label: NutritionDatabaseIngredient = { ...baseDbIngredient, protein: 10 };
    const result = scaleLabelToIngredient(label, { mode: 'servings', amount: 2 });
    expect(result.protein).toBe(20); // 10g/serving × 2
    expect(result.weight).toBe(340); // 170g serving × 2
    expect(result.sourceDatabaseIngredientId).toBe(label.id);
  });

  it('AE: entire package scales by servings-per-package and totals the package weight', () => {
    // serving size 170g, 2 servings/pkg → consumed 340g, factor ×2
    const result = scaleLabelToIngredient(baseDbIngredient, { mode: 'package' });
    expect(result.weight).toBe(340);
    expect(result.fat).toBe(7.2);
    expect(result.protein).toBe(62);
  });
});

// ---------------------------------------------------------------------------
// Meal template structure & nutrition contribution (issue #41)
// ---------------------------------------------------------------------------

import {
  dayMealStructure,
  contributesNutrition,
  DEFAULT_MEAL_TEMPLATE_NAMES,
  dayAdherence,
  dayConsumed,
  goalOutcome,
} from './calculations';
import type { Meal, DailyMealLog, Goal, Ingredient, WeightEntry } from './models';

function makeIngredient(partial: Partial<Ingredient> = {}): Ingredient {
  return {
    id: 'i',
    mealId: 'm',
    name: 'Ingredient',
    weight: 100,
    calories: 0,
    fat: 0,
    saturatedFat: 0,
    carbs: 0,
    fiber: 0,
    protein: 0,
    calorieSource: 'explicit',
    estimatedCalories: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

function makeMeal(partial: Partial<Meal>): Meal {
  return {
    id: 'm',
    dailyMealLogId: 'd',
    name: 'Meal',
    ingredients: [],
    origin: 'adhoc',
    logged: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...partial,
  };
}

function makeDay(meals: Meal[], mealCountTarget = 0): DailyMealLog {
  return {
    id: 'd',
    userId: 'u',
    date: '2026-06-11',
    targetCalories: 2000,
    targetFat: 60,
    targetCarbs: 200,
    targetProtein: 150,
    mealCountTarget,
    weightLbs: null,
    meals,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('DEFAULT_MEAL_TEMPLATE_NAMES', () => {
  it('seeds Breakfast, Lunch, Dinner, Snack in order', () => {
    expect(DEFAULT_MEAL_TEMPLATE_NAMES).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snack']);
  });
});

describe('dayMealStructure', () => {
  it('template-backed day: expected = copied count, tracked = logged copied count', () => {
    const day = makeDay([
      makeMeal({ origin: 'template', logged: true }),
      makeMeal({ origin: 'template', logged: true }),
      makeMeal({ origin: 'template', logged: true }),
      makeMeal({ origin: 'template', logged: false }),
    ]);
    expect(dayMealStructure(day)).toEqual({ kind: 'template', mealsExpected: 4, mealsTracked: 3 });
  });

  it('legacy day (no template meals, mealCountTarget > 0): uses target vs meal count', () => {
    const day = makeDay([makeMeal({ origin: 'adhoc' }), makeMeal({ origin: 'adhoc' })], 3);
    expect(dayMealStructure(day)).toEqual({ kind: 'legacy', mealsExpected: 3, mealsTracked: 2 });
  });

  it('zero-template ad-hoc day: expected = tracked = ad-hoc meal count', () => {
    const day = makeDay([makeMeal({ origin: 'adhoc' }), makeMeal({ origin: 'adhoc' })], 0);
    expect(dayMealStructure(day)).toEqual({ kind: 'adhoc', mealsExpected: 2, mealsTracked: 2 });
  });

  it('empty zero-template day reports kind adhoc with 0 / 0', () => {
    expect(dayMealStructure(makeDay([], 0))).toEqual({
      kind: 'adhoc',
      mealsExpected: 0,
      mealsTracked: 0,
    });
  });
});

describe('contributesNutrition', () => {
  it('unlogged template meal does not contribute', () => {
    expect(contributesNutrition(makeMeal({ origin: 'template', logged: false }))).toBe(false);
  });

  it('logged template meal contributes', () => {
    expect(contributesNutrition(makeMeal({ origin: 'template', logged: true }))).toBe(true);
  });

  it('ad-hoc meal always contributes regardless of logged flag', () => {
    expect(contributesNutrition(makeMeal({ origin: 'adhoc', logged: false }))).toBe(true);
  });
});

function makeGoalFor(partial: Partial<Goal> = {}): Goal {
  return {
    id: 'g',
    userId: 'u',
    isBackground: false,
    name: null,
    description: null,
    mode: 'cut',
    targetWeightLbs: 180,
    macroFats: 25,
    macroCarbs: 35,
    macroProtein: 40,
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    calorieDelta: 0,
    mealSlots: [],
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
    ...partial,
  };
}

// A day whose four ad-hoc meals each carry one ingredient that exactly hits the
// day's targets, so individual checks can be perturbed one at a time.
function onTargetDay(): DailyMealLog {
  const day = makeDay(
    [
      makeMeal({
        origin: 'adhoc',
        ingredients: [makeIngredient({ calories: 2000, fat: 60, carbs: 200, protein: 150 })],
      }),
      makeMeal({ origin: 'adhoc', ingredients: [makeIngredient({ name: 'a' })] }),
      makeMeal({ origin: 'adhoc', ingredients: [makeIngredient({ name: 'b' })] }),
      makeMeal({ origin: 'adhoc', ingredients: [makeIngredient({ name: 'c' })] }),
    ],
    0,
  );
  return day;
}

describe('dayConsumed', () => {
  it('sums only contributing meals', () => {
    const day = makeDay([
      makeMeal({
        origin: 'template',
        logged: true,
        ingredients: [makeIngredient({ calories: 500, protein: 40 })],
      }),
      makeMeal({
        origin: 'template',
        logged: false,
        ingredients: [makeIngredient({ calories: 999 })],
      }),
    ]);
    expect(dayConsumed(day)).toEqual({ calories: 500, fat: 0, carbs: 0, protein: 40 });
  });
});

describe('dayAdherence', () => {
  it('passes when meal count, calories (±5%) and all macros (±2%) pass (AE12)', () => {
    expect(dayAdherence(onTargetDay()).pass).toBe(true);
  });

  it('fails when calories exceed ±5% (AE13 calories)', () => {
    const day = onTargetDay();
    day.meals[0].ingredients[0].calories = 2200; // +10%
    const a = dayAdherence(day);
    expect(a.calories).toBe(false);
    expect(a.pass).toBe(false);
  });

  it('fails when any macro exceeds ±2% (AE13 macro)', () => {
    const day = onTargetDay();
    day.meals[0].ingredients[0].protein = 200; // far over
    const a = dayAdherence(day);
    expect(a.protein).toBe(false);
    expect(a.pass).toBe(false);
  });

  it('fails when meal count is incomplete (AE14)', () => {
    const day = onTargetDay();
    day.meals[3].ingredients = []; // only 3 of 4 ad-hoc meals carry ingredients
    const a = dayAdherence(day);
    expect(a.mealCount).toBe(false);
    expect(a.pass).toBe(false);
  });

  it('fails an empty day (R67)', () => {
    expect(dayAdherence(makeDay([], 0)).pass).toBe(false);
  });
});

describe('goalOutcome', () => {
  const today = '2026-06-16';

  it('reaches a Cut goal within +2% (AE15)', () => {
    const goal = makeGoalFor({
      mode: 'cut',
      targetWeightLbs: 180,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });
    const w: WeightEntry[] = [{ date: '2026-05-30', weightLbs: 183 }];
    expect(goalOutcome(goal, w, today)).toBe('reached');
  });

  it('misses a Cut goal above +2%', () => {
    const goal = makeGoalFor({
      mode: 'cut',
      targetWeightLbs: 180,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });
    const w: WeightEntry[] = [{ date: '2026-05-30', weightLbs: 185 }];
    expect(goalOutcome(goal, w, today)).toBe('missed');
  });

  it('misses a completed goal with no in-window weight (AE16)', () => {
    const goal = makeGoalFor({ mode: 'maintain', startDate: '2026-05-01', endDate: '2026-05-31' });
    const w: WeightEntry[] = [{ date: '2026-06-10', weightLbs: 180 }];
    expect(goalOutcome(goal, w, today)).toBe('missed');
  });

  it('returns null for an active (not-yet-completed) goal', () => {
    const goal = makeGoalFor({ endDate: '2026-07-31' });
    expect(goalOutcome(goal, [], today)).toBeNull();
  });

  it('returns null for the background goal (R75)', () => {
    const goal = makeGoalFor({ isBackground: true, endDate: null, targetWeightLbs: null });
    expect(goalOutcome(goal, [], today)).toBeNull();
  });
});
