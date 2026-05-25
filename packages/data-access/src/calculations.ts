import type { UserProfile } from './models';

export function caloriesFromMode(
  weightLbs: number,
  mode: 'deficit' | 'maintenance' | 'surplus',
): number | null {
  if (weightLbs < 90) return null;
  const multiplier = mode === 'deficit' ? 10 : mode === 'maintenance' ? 15 : 16;
  return Math.ceil(weightLbs * multiplier);
}

export function targetCaloriesFromProfile(profile: UserProfile): number {
  if (profile.calorieMode === 'custom') return profile.targetCalories ?? 0;
  return caloriesFromMode(profile.weightLbs, profile.calorieMode) ?? 0;
}

export function macrosFromPercentage(
  calories: number,
  fats: number,
  carbs: number,
  protein: number,
) {
  return {
    targetFat: Math.round((calories * (fats / 100)) / 9),
    targetCarbs: Math.round((calories * (carbs / 100)) / 4),
    targetProtein: Math.round((calories * (protein / 100)) / 4),
  };
}

export function dayTargetsFromProfile(profile: UserProfile) {
  const calories = targetCaloriesFromProfile(profile);
  if (profile.macroMode === 'custom') {
    return {
      targetCalories: calories,
      targetFat: Math.round(profile.macroFats),
      targetCarbs: Math.round(profile.macroCarbs),
      targetProtein: Math.round(profile.macroProtein),
    };
  }
  return {
    targetCalories: calories,
    ...macrosFromPercentage(calories, profile.macroFats, profile.macroCarbs, profile.macroProtein),
  };
}
