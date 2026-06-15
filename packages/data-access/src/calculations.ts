import type {
  UserProfile,
  NutritionDatabaseIngredient,
  NutritionUnit,
  Meal,
  DailyMealLog,
} from './models';

// Default meal templates seeded for a brand-new user (issue #41).
export const DEFAULT_MEAL_TEMPLATE_NAMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

// A meal's calories/macros count toward day totals only when it is a logged
// template meal, or an ad-hoc meal (which has no logged state and counts
// directly). See R23/R25/R35.
export function contributesNutrition(meal: Meal): boolean {
  return meal.origin !== 'template' || meal.logged;
}

// Coverage is derived from each day's own copied/ad-hoc meal structure rather
// than the user's current template list (R40). Template-backed days expect their
// copied meal count and track logged copies (R37/R38); zero-template ad-hoc days
// treat every ad-hoc meal as both expected and tracked (R39); pre-feature days
// fall back to their stored mealCountTarget so history is not rewritten (R15).
export function dayMealStructure(day: DailyMealLog): {
  kind: 'template' | 'adhoc' | 'legacy';
  mealsExpected: number;
  mealsTracked: number;
} {
  const copied = day.meals.filter((m) => m.origin === 'template');
  if (copied.length > 0) {
    return {
      kind: 'template',
      mealsExpected: copied.length,
      mealsTracked: copied.filter((m) => m.logged).length,
    };
  }
  if (day.mealCountTarget > 0) {
    return { kind: 'legacy', mealsExpected: day.mealCountTarget, mealsTracked: day.meals.length };
  }
  return { kind: 'adhoc', mealsExpected: day.meals.length, mealsTracked: day.meals.length };
}

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

export type CalorieEstimateInput = {
  fat: number;
  carbs: number;
  protein: number;
  fiber?: number | null; // 2 kcal/g
  sugarAlcohol?: number | null; // 2.4 kcal/g
  allulose?: number | null; // 0.4 kcal/g
  alcohol?: number | null; // 7 kcal/g, separate from carbs
};

export function estimateCalories(i: CalorieEstimateInput): number {
  const fiberC = Math.min(Math.max(0, i.fiber ?? 0), i.carbs);
  const saC = Math.min(Math.max(0, i.sugarAlcohol ?? 0), i.carbs - fiberC);
  const alluC = Math.min(Math.max(0, i.allulose ?? 0), i.carbs - fiberC - saC);
  const digestible = i.carbs - fiberC - saC - alluC;
  return round1(
    i.fat * 9 +
      i.protein * 4 +
      digestible * 4 +
      fiberC * 2 +
      saC * 2.4 +
      alluC * 0.4 +
      Math.max(0, i.alcohol ?? 0) * 7,
  );
}

export type ScaledNutritionSnapshot = {
  name: string;
  weight: number;
  calories: number;
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
  sugarAlcohol?: number;
  allulose?: number;
  alcohol?: number;
  micronutrients?: Array<{ name: string; amount: number; unit: NutritionUnit }>;
  sourceDatabaseIngredientId: string;
};

// How a saved nutrition label is applied to a meal (R22). Facts are stored
// per serving, so:
//   weight   → factor = consumed grams / serving size; consumed = amount
//   servings → factor = serving count;                 consumed = amount × serving size
//   package  → factor = servings per package;          consumed = serving size × servings/pkg
export type AddLabelToMealInput =
  | { mode: 'weight'; amount: number }
  | { mode: 'servings'; amount: number }
  | { mode: 'package' };

function resolveLabelFactor(
  label: NutritionDatabaseIngredient,
  input: AddLabelToMealInput,
): { factor: number; consumedAmount: number } {
  switch (input.mode) {
    case 'weight':
      return { factor: input.amount / label.servingAmount, consumedAmount: input.amount };
    case 'servings':
      return { factor: input.amount, consumedAmount: input.amount * label.servingAmount };
    case 'package':
      return {
        factor: label.servingsPerPackage,
        consumedAmount: label.servingAmount * label.servingsPerPackage,
      };
  }
}

// Produces a consumed-nutrition snapshot that references its source label (R23)
// and never changes when the label is later edited (R24 — callers persist this
// value, not a live reference). Replaces the old weight-only scaler.
export function scaleLabelToIngredient(
  label: NutritionDatabaseIngredient,
  input: AddLabelToMealInput,
): ScaledNutritionSnapshot {
  const { factor, consumedAmount } = resolveLabelFactor(label, input);
  const scaleVal = (v: number) => round1(v * factor);

  const result: ScaledNutritionSnapshot = {
    name: label.name,
    weight: round1(consumedAmount),
    calories: scaleVal(label.calories),
    fat: scaleVal(label.fat),
    carbs: scaleVal(label.carbs),
    protein: scaleVal(label.protein),
    sourceDatabaseIngredientId: label.id,
  };

  if (label.saturatedFat != null) result.saturatedFat = scaleVal(label.saturatedFat);
  if (label.unsaturatedFat != null) result.unsaturatedFat = scaleVal(label.unsaturatedFat);
  if (label.monounsaturatedFat != null)
    result.monounsaturatedFat = scaleVal(label.monounsaturatedFat);
  if (label.polyunsaturatedFat != null)
    result.polyunsaturatedFat = scaleVal(label.polyunsaturatedFat);
  if (label.transFat != null) result.transFat = scaleVal(label.transFat);
  if (label.fiber != null) result.fiber = scaleVal(label.fiber);
  if (label.sugar != null) result.sugar = scaleVal(label.sugar);
  if (label.sugarAlcohol != null) result.sugarAlcohol = scaleVal(label.sugarAlcohol);
  if (label.allulose != null) result.allulose = scaleVal(label.allulose);
  if (label.alcohol != null) result.alcohol = scaleVal(label.alcohol);

  if (label.micronutrients != null) {
    // %DV is intentionally dropped here (R4); only typed amounts scale.
    result.micronutrients = label.micronutrients.map((m) => ({
      name: m.name,
      unit: m.unit,
      amount: scaleVal(m.amount),
    }));
  }

  return result;
}
