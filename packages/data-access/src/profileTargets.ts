import type { ActivityLevel } from './models';
import { macrosFromPercentage } from './calculations';
import { ACTIVITY_MULTIPLIER, GOAL_MULTIPLIER, LBS_PER_KG } from './goals';

// Calorie targets from a single mobile calorie profile (#75). Follows the #82
// model with the mode factor fixed at 1.0: protein and fat come from BMR alone;
// activity calories and the calorie delta go into carbs only. Kept separate from
// goals.ts (web) on purpose; merge into one shared chain when #82 lands.

// Latest weight × this until a body fat result exists (= today's maintain).
export const BODYWEIGHT_FALLBACK_MULTIPLIER = GOAL_MULTIPLIER.maintain;

export type ProfileTargetInputs = {
  weightLbs: number;
  bodyFatPct: number | null;
  activityLevel: ActivityLevel | null;
  calorieDelta: number;
  macroFats: number;
  macroCarbs: number;
  macroProtein: number;
};

export type ProfileTargets = {
  targetCalories: number;
  targetFat: number;
  targetCarbs: number;
  targetProtein: number;
  basis: 'katch' | 'bodyweight';
  // Unrounded Katch chain for display; null on the bodyweight fallback.
  breakdown: { lbmKg: number; bmr: number; activityKcal: number } | null;
};

type Basis = {
  // Calories the protein/fat split is applied to, and the carb share base.
  splitKcal: number;
  activityKcal: number;
  breakdown: ProfileTargets['breakdown'];
};

function basisOf(i: ProfileTargetInputs): Basis {
  if (i.bodyFatPct == null) {
    const base = Math.ceil(i.weightLbs * BODYWEIGHT_FALLBACK_MULTIPLIER);
    return { splitKcal: base, activityKcal: 0, breakdown: null };
  }
  const lbmKg = (i.weightLbs / LBS_PER_KG) * (1 - i.bodyFatPct / 100);
  const bmr = 370 + 21.6 * lbmKg;
  const activityKcal = i.activityLevel ? bmr * (ACTIVITY_MULTIPLIER[i.activityLevel] - 1) : 0;
  return { splitKcal: bmr, activityKcal, breakdown: { lbmKg, bmr, activityKcal } };
}

export function profileTargets(i: ProfileTargetInputs): ProfileTargets {
  const { splitKcal, activityKcal, breakdown } = basisOf(i);
  const { targetFat, targetProtein } = macrosFromPercentage(
    splitKcal,
    i.macroFats,
    i.macroCarbs,
    i.macroProtein,
  );
  const carbKcal = Math.max(0, splitKcal * (i.macroCarbs / 100) + activityKcal + i.calorieDelta);
  return {
    basis: breakdown ? 'katch' : 'bodyweight',
    breakdown,
    targetCalories: Math.max(0, Math.round(splitKcal + activityKcal + i.calorieDelta)),
    targetFat,
    targetProtein,
    targetCarbs: Math.round(carbKcal / 4),
  };
}

// The lowest delta that keeps carb calories at or above 0 (R18):
// −floor(carb share of the base + activity kcal). Ignores `calorieDelta`.
export function minProfileDelta(i: ProfileTargetInputs): number {
  const { splitKcal, activityKcal } = basisOf(i);
  const floorKcal = Math.floor(splitKcal * (i.macroCarbs / 100) + activityKcal);
  return floorKcal === 0 ? 0 : -floorKcal;
}
