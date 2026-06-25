import { describe, it, expect } from 'vitest';
import {
  caloriesFromMode,
  macrosFromPercentage,
  dayTargetsFromProfile,
  macroAccuracy,
  trackingCoverage,
  estimateCalories,
  scaleLabelToIngredient,
  vTaperRatio,
  roundVTaper,
  vTaperGapToTarget,
  V_TAPER_TARGET,
  weeklyWeightDelta,
  weeklyWeightAverages,
  MIN_WEIGH_INS_PER_WINDOW,
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
  frontBaselineDate: null,
  sideBaselineDate: null,
  backBaselineDate: null,
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

describe('vTaperRatio', () => {
  it('computes shoulder ÷ waist when both present (BDD 50/32 → 1.5625)', () => {
    expect(vTaperRatio(50, 32)).toBeCloseTo(1.5625, 4);
  });

  it('returns null when shoulder is missing (R6)', () => {
    expect(vTaperRatio(null, 32)).toBeNull();
    expect(vTaperRatio(undefined, 32)).toBeNull();
  });

  it('returns null when waist is missing (R6)', () => {
    expect(vTaperRatio(50, null)).toBeNull();
    expect(vTaperRatio(50, undefined)).toBeNull();
  });

  it('returns null for non-positive inputs rather than a broken ratio (R9)', () => {
    expect(vTaperRatio(0, 32)).toBeNull();
    expect(vTaperRatio(50, 0)).toBeNull();
    expect(vTaperRatio(-1, 32)).toBeNull();
  });
});

describe('roundVTaper', () => {
  it('rounds 50/32 to 1.56 (BDD)', () => {
    expect(roundVTaper(vTaperRatio(50, 32)!)).toBe(1.56);
  });

  it('rounds 51/31 to 1.65 (BDD: north star met)', () => {
    expect(roundVTaper(vTaperRatio(51, 31)!)).toBe(1.65);
  });
});

describe('v-taper north star', () => {
  it('north-star target is 1.6 (R7)', () => {
    expect(V_TAPER_TARGET).toBe(1.6);
  });

  it('51/31 ≈ 1.645 meets the 1.6 target (BDD)', () => {
    expect(vTaperRatio(51, 31)!).toBeGreaterThanOrEqual(V_TAPER_TARGET);
  });

  it('50/32 = 1.5625 is short of the target', () => {
    expect(vTaperRatio(50, 32)!).toBeLessThan(V_TAPER_TARGET);
  });

  it('gap to target is 1.6 − ratio, never negative', () => {
    expect(vTaperGapToTarget(1.5625)).toBe(0.04);
    expect(vTaperGapToTarget(1.65)).toBe(0);
  });
});

describe('weeklyWeightDelta', () => {
  const today = '2026-06-26';

  // Helper: an entry on `today` shifted back `daysAgo` days.
  function ago(daysAgo: number, weightLbs: number): WeightEntry {
    const [y, m, d] = today.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() - daysAgo);
    return { date: dt.toISOString().slice(0, 10), weightLbs };
  }

  it('measures avg(last 7) − avg(prior 7) = -2.0 lb (BDD)', () => {
    const entries: WeightEntry[] = [
      // last 7 days average 199
      ago(0, 199),
      ago(1, 199),
      ago(2, 199),
      ago(3, 199),
      // prior 7 days average 201
      ago(7, 201),
      ago(8, 201),
      ago(9, 201),
      ago(10, 201),
    ];
    const result = weeklyWeightDelta(entries, today);
    expect(result).not.toBeNull();
    expect(result!.deltaLbs).toBe(-2);
    expect(result!.lastAvgLbs).toBe(199);
    expect(result!.priorAvgLbs).toBe(201);
  });

  it('returns null with only 2 total weigh-ins (BDD: needs more weigh-ins)', () => {
    const entries: WeightEntry[] = [ago(0, 199), ago(1, 199)];
    expect(weeklyWeightDelta(entries, today)).toBeNull();
  });

  it('returns null when one window is below the minimum', () => {
    // 4 in the last window, only 1 in the prior window → insufficient.
    const entries: WeightEntry[] = [
      ago(0, 199),
      ago(1, 199),
      ago(2, 199),
      ago(3, 199),
      ago(8, 201),
    ];
    expect(weeklyWeightDelta(entries, today)).toBeNull();
  });

  it('requires at least MIN_WEIGH_INS_PER_WINDOW per window', () => {
    expect(MIN_WEIGH_INS_PER_WINDOW).toBe(2);
    const entries: WeightEntry[] = [ago(0, 200), ago(6, 200), ago(7, 202), ago(13, 202)];
    const result = weeklyWeightDelta(entries, today);
    expect(result).not.toBeNull();
    expect(result!.deltaLbs).toBe(-2);
  });

  it('excludes weigh-ins older than 14 days from both windows', () => {
    const entries: WeightEntry[] = [
      ago(0, 200),
      ago(1, 200),
      ago(7, 205),
      ago(8, 205),
      ago(20, 150), // far outside both windows — must not affect the delta
    ];
    const result = weeklyWeightDelta(entries, today);
    expect(result!.deltaLbs).toBe(-5);
  });
});

describe('weeklyWeightAverages', () => {
  it('buckets weigh-ins by Monday-anchored week and averages each', () => {
    // 2026-06-22 is a Monday; 2026-06-15 the prior Monday.
    const entries: WeightEntry[] = [
      { date: '2026-06-22', weightLbs: 200 },
      { date: '2026-06-24', weightLbs: 198 },
      { date: '2026-06-15', weightLbs: 204 },
      { date: '2026-06-17', weightLbs: 202 },
    ];
    const result = weeklyWeightAverages(entries);
    expect(result).toEqual([
      { weekStart: '2026-06-15', avgLbs: 203, count: 2 },
      { weekStart: '2026-06-22', avgLbs: 199, count: 2 },
    ]);
  });

  it('returns an empty array for no entries', () => {
    expect(weeklyWeightAverages([])).toEqual([]);
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
    shoulderInches: null,
    waistInches: null,
    bicepInches: null,
    thighInches: null,
    frontPhotoKey: null,
    sidePhotoKey: null,
    backPhotoKey: null,
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
    calorieBasis: 'bodyweight',
    bodyFatPct: null,
    activityLevel: null,
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

  it('reaches a completed goal with no weight target (optional target)', () => {
    const goal = makeGoalFor({
      targetWeightLbs: null,
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });
    expect(goalOutcome(goal, [], today)).toBe('reached');
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
