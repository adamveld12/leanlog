import { describe, expect, it } from 'vitest';
import {
  BODYWEIGHT_FALLBACK_MULTIPLIER,
  minProfileDelta,
  profileTargets,
  type ProfileTargetInputs,
} from './profileTargets';

const base: ProfileTargetInputs = {
  weightLbs: 180,
  bodyFatPct: 15,
  activityLevel: null,
  calorieDelta: 0,
  macroFats: 30,
  macroCarbs: 40,
  macroProtein: 30,
};

describe('profileTargets (Katch, mode fixed at 1.0)', () => {
  it('AE1: no activity, delta 0 → BMR only', () => {
    const t = profileTargets(base);
    expect(t.basis).toBe('katch');
    expect(t.targetCalories).toBe(1869);
    expect(t.targetFat).toBe(62);
    expect(t.targetProtein).toBe(140);
    expect(t.targetCarbs).toBe(187);
    expect(t.breakdown?.lbmKg).toBeCloseTo(69.4, 1);
    expect(t.breakdown?.bmr).toBeCloseTo(1869.0, 0);
    expect(t.breakdown?.activityKcal).toBe(0);
  });

  it('AE2: activity fuels carbs only', () => {
    const t = profileTargets({ ...base, activityLevel: 'moderate' });
    expect(t.targetCalories).toBe(2897);
    expect(t.targetFat).toBe(62);
    expect(t.targetProtein).toBe(140);
    expect(t.targetCarbs).toBe(444);
    expect(t.breakdown?.activityKcal).toBeCloseTo(1027.95, 1);
  });

  it('AE3: a negative delta lowers carbs only', () => {
    const t = profileTargets({ ...base, activityLevel: 'moderate', calorieDelta: -300 });
    expect(t.targetCalories).toBe(2597);
    expect(t.targetCarbs).toBe(369);
    expect(t.targetFat).toBe(62);
    expect(t.targetProtein).toBe(140);
  });

  it('AE4: the lowest allowed delta is -floor(carb kcal) and carbs never go negative', () => {
    const i = { ...base, activityLevel: 'moderate' as const };
    expect(minProfileDelta(i)).toBe(-1775);
    const t = profileTargets({ ...i, calorieDelta: -1800 });
    expect(t.targetCarbs).toBe(0);
  });

  it('AE5: bodyweight fallback is weight × 15 with the split on all of it', () => {
    expect(BODYWEIGHT_FALLBACK_MULTIPLIER).toBe(15);
    const t = profileTargets({ ...base, bodyFatPct: null });
    expect(t.basis).toBe('bodyweight');
    expect(t.breakdown).toBeNull();
    expect(t.targetCalories).toBe(2700);
    expect(t.targetFat).toBe(90);
    expect(t.targetCarbs).toBe(270);
    expect(t.targetProtein).toBe(203);
  });

  it('fallback applies the delta and carbs absorb it', () => {
    const i = { ...base, bodyFatPct: null, calorieDelta: -300 };
    const t = profileTargets(i);
    expect(t.targetCalories).toBe(2400);
    expect(t.targetFat).toBe(90);
    expect(t.targetProtein).toBe(203);
    expect(t.targetCarbs).toBe(195);
    expect(minProfileDelta({ ...i, calorieDelta: 0 })).toBe(-1080);
  });
});
