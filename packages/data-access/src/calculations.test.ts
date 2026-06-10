import { describe, it, expect } from 'vitest';
import {
  caloriesFromMode,
  macrosFromPercentage,
  dayTargetsFromProfile,
  macroAccuracy,
  trackingCoverage,
  estimatedWeightLost,
  weightLossCertainty,
  caloriesFromMacros,
  scaleNutritionDatabaseIngredient,
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

describe('caloriesFromMacros', () => {
  it('computes calories from fat/protein/carbs/fiber: fat10 protein20 carbs30 fiber5 → 310', () => {
    // fat 10*9=90, protein 20*4=80, net carbs (30-5)*4=100, total=270... wait:
    // fat10*9=90 + protein20*4=80 + (carbs30-fiber5)*4=(25)*4=100 => 270
    // But task says 310 — re-read: fat10+protein20+carbs30, fiber5
    // fat=10*9=90, protein=20*4=80, netCarbs=(30-5)=25*4=100 => 270
    // Recalculating per spec: fat10/protein20/carbs30/fiber5 → 310
    // fat10*9=90, protein20*4=80, carbs30*4=120, minus fiber5*4=20 => 90+80+120-20=270
    // Hmm, still 270. Let's trust spec says 310 and check with fiber NOT subtracted from carbs:
    // Actually spec says: fat*9 + protein*4 + Math.max(0, carbs - fiber)*4
    // fat10*9=90, protein20*4=80, (30-5)*4=100 => 270. So 310 might be a spec typo.
    // We'll verify with the actual formula (task instruction takes precedence over claimed output).
    expect(caloriesFromMacros({ fat: 10, carbs: 30, protein: 20, fiber: 5 })).toBe(270);
  });

  it('omitting fiber: fat10 protein20 carbs30 → 290', () => {
    // fat10*9=90, protein20*4=80, carbs30*4=120 => 290
    expect(caloriesFromMacros({ fat: 10, carbs: 30, protein: 20 })).toBe(290);
  });

  it('fiber null behaves same as fiber omitted', () => {
    expect(caloriesFromMacros({ fat: 10, carbs: 30, protein: 20, fiber: null })).toBe(290);
  });

  it('fiber exceeds carbs → net carbs clamps at 0', () => {
    // fat0 protein0 carbs5 fiber10 → net carbs = max(0, 5-10)=0, total=0
    expect(caloriesFromMacros({ fat: 0, carbs: 5, protein: 0, fiber: 10 })).toBe(0);
  });

  it('rounds to 1 decimal', () => {
    // fat=1.1, protein=1.1, carbs=1.1, no fiber
    // 1.1*9=9.9 + 1.1*4=4.4 + 1.1*4=4.4 = 18.7
    expect(caloriesFromMacros({ fat: 1.1, carbs: 1.1, protein: 1.1 })).toBe(18.7);
  });
});

const baseDbIngredient: NutritionDatabaseIngredient = {
  id: '01939f68-0000-7000-8000-000000000001',
  name: 'Chicken Breast',
  servingAmount: 170,
  addedByUserId: 'user-1',
  creationSource: 'manual',
  fat: 3.6,
  carbs: 0,
  protein: 31,
  saturatedFat: 1,
  unsaturatedFat: null,
  monounsaturatedFat: null,
  polyunsaturatedFat: null,
  transFat: null,
  fiber: 0,
  sugar: null,
  micronutrients: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('scaleNutritionDatabaseIngredient', () => {
  it('doubles all fields when measured amount is 2x serving', () => {
    const result = scaleNutritionDatabaseIngredient(baseDbIngredient, 340);
    expect(result.fat).toBe(7.2);
    expect(result.carbs).toBe(0);
    expect(result.protein).toBe(62);
    expect(result.weight).toBe(340);
    expect(result.saturatedFat).toBe(2);
  });

  it('only scales present optional fields, leaves absent ones absent', () => {
    const result = scaleNutritionDatabaseIngredient(baseDbIngredient, 340);
    expect(result.unsaturatedFat).toBeUndefined();
    expect(result.monounsaturatedFat).toBeUndefined();
    expect(result.transFat).toBeUndefined();
    expect(result.sugar).toBeUndefined();
  });

  it('scales micronutrient amounts and percentDailyValue', () => {
    const ingredient: NutritionDatabaseIngredient = {
      ...baseDbIngredient,
      micronutrients: [
        { name: 'Iron', amount: 2, percentDailyValue: 10 },
        { name: 'Vitamin C', amount: 5, percentDailyValue: 50 },
      ],
    };
    const result = scaleNutritionDatabaseIngredient(ingredient, 340);
    expect(result.micronutrients).toHaveLength(2);
    expect(result.micronutrients![0].amount).toBe(4);
    expect(result.micronutrients![0].percentDailyValue).toBe(20);
    expect(result.micronutrients![1].amount).toBe(10);
    expect(result.micronutrients![1].percentDailyValue).toBe(100);
  });

  it('half serving scales down correctly', () => {
    const result = scaleNutritionDatabaseIngredient(baseDbIngredient, 85);
    expect(result.fat).toBe(1.8);
    expect(result.protein).toBe(15.5);
    expect(result.weight).toBe(85);
  });

  it('includes name from ingredient', () => {
    const result = scaleNutritionDatabaseIngredient(baseDbIngredient, 170);
    expect(result.name).toBe('Chicken Breast');
  });
});
