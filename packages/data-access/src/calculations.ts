import type { UserProfile, NutritionDatabaseIngredient } from './models';

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

export function macroAccuracy(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.round((1 - Math.abs(1 - actual / target)) * 100));
}

export function trackingCoverage(mealsTracked: number, mealsExpected: number): number {
  if (mealsExpected <= 0) return 0;
  return Math.min(100, Math.round((mealsTracked / mealsExpected) * 100));
}

export function estimatedWeightLost(totalConsumed: number, totalMaintenance: number): number {
  const deficit = totalMaintenance - totalConsumed;
  if (deficit <= 0) return 0;
  return Math.round((deficit / 3000) * 10) / 10;
}

export function weightLossCertainty(coveragePct: number): number {
  return Math.min(80, Math.round(coveragePct * 0.8));
}

// ---------------------------------------------------------------------------
// Nutrition database helpers
// ---------------------------------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;

export function caloriesFromMacros({
  fat,
  carbs,
  protein,
  fiber,
}: {
  fat: number;
  carbs: number;
  protein: number;
  fiber?: number | null;
}): number {
  const netCarbs = Math.max(0, carbs - (fiber ?? 0));
  return round1(fat * 9 + protein * 4 + netCarbs * 4);
}

export type ScaledNutritionSnapshot = {
  name: string;
  weight: number;
  fat: number;
  carbs: number;
  protein: number;
  saturatedFat?: number;
  unsaturatedFat?: number;
  monounsaturatedFat?: number;
  polyunsaturatedFat?: number;
  transFat?: number;
  fiber?: number;
  sugar?: number;
  micronutrients?: Array<{
    name: string;
    amount?: number;
    unit?: string;
    percentDailyValue?: number;
  }>;
  sourceDatabaseIngredientId: string;
};

export function scaleNutritionDatabaseIngredient(
  ingredient: NutritionDatabaseIngredient,
  measuredAmount: number,
): ScaledNutritionSnapshot {
  const factor = measuredAmount / ingredient.servingAmount;
  const scaleVal = (v: number) => round1(v * factor);

  const result: ScaledNutritionSnapshot = {
    name: ingredient.name,
    weight: measuredAmount,
    fat: scaleVal(ingredient.fat),
    carbs: scaleVal(ingredient.carbs),
    protein: scaleVal(ingredient.protein),
    sourceDatabaseIngredientId: ingredient.id,
  };

  if (ingredient.saturatedFat != null) result.saturatedFat = scaleVal(ingredient.saturatedFat);
  if (ingredient.unsaturatedFat != null)
    result.unsaturatedFat = scaleVal(ingredient.unsaturatedFat);
  if (ingredient.monounsaturatedFat != null)
    result.monounsaturatedFat = scaleVal(ingredient.monounsaturatedFat);
  if (ingredient.polyunsaturatedFat != null)
    result.polyunsaturatedFat = scaleVal(ingredient.polyunsaturatedFat);
  if (ingredient.transFat != null) result.transFat = scaleVal(ingredient.transFat);
  if (ingredient.fiber != null) result.fiber = scaleVal(ingredient.fiber);
  if (ingredient.sugar != null) result.sugar = scaleVal(ingredient.sugar);

  if (ingredient.micronutrients != null) {
    result.micronutrients = ingredient.micronutrients.map((m) => ({
      name: m.name,
      unit: m.unit,
      amount: m.amount != null ? scaleVal(m.amount) : undefined,
      percentDailyValue: m.percentDailyValue != null ? scaleVal(m.percentDailyValue) : undefined,
    }));
  }

  return result;
}
