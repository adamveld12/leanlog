import { describe, it, expect } from 'vitest';
import {
  caloriesFromMode,
  macrosFromPercentage,
  dayTargetsFromProfile,
  macroAccuracy,
  trackingCoverage,
  estimatedWeightLost,
  weightLossCertainty,
} from './calculations';
import type { UserProfile } from './models';

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
