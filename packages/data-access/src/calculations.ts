import type {
  UserProfile,
  NutritionDatabaseIngredient,
  NutritionUnit,
  Meal,
  DailyMealLog,
  Goal,
  WeightEntry,
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
// Body measurements, v-taper ratio & measured weekly weight delta (#68)
// ---------------------------------------------------------------------------

// The app's single defining physique target for v1 (R7): shoulders 1.6× the
// waist. Body fat (the eventual "sub-15%" half of the north star) is deferred.
export const V_TAPER_TARGET = 1.6;

// V-taper = shoulder ÷ waist, computed for a day only when BOTH the shoulder and
// waist are present (R6). Returns null when either is missing or non-positive, so
// callers render a prompt/empty state rather than a zero or a broken ratio (R9).
export function vTaperRatio(
  shoulderInches: number | null | undefined,
  waistInches: number | null | undefined,
): number | null {
  if (shoulderInches == null || waistInches == null) return null;
  if (shoulderInches <= 0 || waistInches <= 0) return null;
  return shoulderInches / waistInches;
}

// Display rounding for a v-taper ratio: two decimals (R6 BDD: 50/32 → 1.56,
// 51/31 → 1.65). The "met" check uses the raw ratio against V_TAPER_TARGET, not
// this rounded value, so a 1.595→1.60 display never falsely reads as reached.
export function roundVTaper(ratio: number): number {
  return Math.round(ratio * 100) / 100;
}

// The gap remaining to the 1.6 north star (R7), never negative. Zero once met.
export function vTaperGapToTarget(ratio: number): number {
  return Math.max(0, Math.round((V_TAPER_TARGET - ratio) * 100) / 100);
}

// Shifts an ISO (YYYY-MM-DD) calendar date by a whole number of days. Computed in
// UTC so it never drifts across a DST boundary — the dates are calendar-only.
function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function averageWeight(entries: WeightEntry[]): number {
  return entries.reduce((sum, e) => sum + e.weightLbs, 0) / entries.length;
}

// Minimum weigh-ins required in EACH trailing 7-day window before a measured
// weekly delta is shown (R12). Two per window keeps a single noisy reading from
// defining the trend while still surfacing for anyone weighing a couple of times
// a week. Below this in either window, callers show a "needs more weigh-ins"
// placeholder rather than a misleading number.
export const MIN_WEIGH_INS_PER_WINDOW = 2;

export type WeeklyWeightDelta = {
  // avg(last 7 days) − avg(prior 7 days), rounded to 0.1 lb. Negative = lost.
  deltaLbs: number;
  lastAvgLbs: number;
  priorAvgLbs: number;
  lastCount: number;
  priorCount: number;
};

// The measured week-over-week weight number (R10): the average of the last 7
// logged days minus the average of the prior 7 logged days, relative to `today`.
// Replaces the calorie-deficit "Est. Weight Lost" estimate. Returns null when
// either 7-day window has fewer than MIN_WEIGH_INS_PER_WINDOW weigh-ins (R12).
// The same value headlines the week-over-week weight tab so the two never
// disagree (R13).
export function weeklyWeightDelta(entries: WeightEntry[], today: string): WeeklyWeightDelta | null {
  // last window = [today−6 .. today]; prior window = [today−13 .. today−7].
  const lastStart = addDaysIso(today, -6);
  const priorStart = addDaysIso(today, -13);
  const priorEnd = addDaysIso(today, -7);

  const last = entries.filter((e) => e.date >= lastStart && e.date <= today);
  const prior = entries.filter((e) => e.date >= priorStart && e.date <= priorEnd);

  if (last.length < MIN_WEIGH_INS_PER_WINDOW || prior.length < MIN_WEIGH_INS_PER_WINDOW) {
    return null;
  }

  const lastAvg = averageWeight(last);
  const priorAvg = averageWeight(prior);
  return {
    deltaLbs: Math.round((lastAvg - priorAvg) * 10) / 10,
    lastAvgLbs: Math.round(lastAvg * 10) / 10,
    priorAvgLbs: Math.round(priorAvg * 10) / 10,
    lastCount: last.length,
    priorCount: prior.length,
  };
}

export type WeeklyWeightAverage = { weekStart: string; avgLbs: number; count: number };

// Buckets weigh-ins into Monday-anchored calendar weeks and averages each, for
// the de-noised week-over-week trend line (R14). Returned oldest-week-first with
// each point dated at its Monday so the line plots chronologically.
export function weeklyWeightAverages(entries: WeightEntry[]): WeeklyWeightAverage[] {
  const buckets = new Map<string, number[]>();
  for (const e of entries) {
    const weekStart = mondayStartIso(e.date);
    const list = buckets.get(weekStart);
    if (list) list.push(e.weightLbs);
    else buckets.set(weekStart, [e.weightLbs]);
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([weekStart, values]) => ({
      weekStart,
      avgLbs: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10,
      count: values.length,
    }));
}

// The Monday on or before an ISO date (ISO-8601 week start), UTC calendar math.
function mondayStartIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun..6=Sat
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDaysIso(iso, diff);
}

// ---------------------------------------------------------------------------
// Goal adherence & outcomes (#56)
// ---------------------------------------------------------------------------

// Daily calorie adherence allows ±5% (R69); each macro allows ±2% (R70).
export const CALORIE_TOLERANCE = 0.05;
export const MACRO_TOLERANCE = 0.02;

function withinTolerance(actual: number, target: number, tol: number): boolean {
  if (target <= 0) return false;
  return Math.abs(actual - target) <= target * tol;
}

// Sum of calories/macros across the meals that contribute to a day's totals
// (logged template meals + ad-hoc meals). Used for adherence checks.
export function dayConsumed(day: DailyMealLog): {
  calories: number;
  fat: number;
  carbs: number;
  protein: number;
} {
  let calories = 0;
  let fat = 0;
  let carbs = 0;
  let protein = 0;
  for (const meal of day.meals) {
    if (!contributesNutrition(meal)) continue;
    for (const ing of meal.ingredients) {
      calories += ing.calories;
      fat += ing.fat;
      carbs += ing.carbs;
      protein += ing.protein;
    }
  }
  return { calories, fat, carbs, protein };
}

export type DayAdherence = {
  mealCount: boolean;
  calories: boolean;
  fat: boolean;
  carbs: boolean;
  protein: boolean;
  pass: boolean;
};

// A day succeeds only when its expected meals all have ingredients and calories
// and every macro land inside tolerance (R64–R70). A day with nothing tracked
// fails outright (R67); meal-count success counts meals with ≥1 ingredient and
// ignores slot names (R68).
export function dayAdherence(day: DailyMealLog): DayAdherence {
  const { mealsExpected } = dayMealStructure(day);
  // R68: meal-count success counts meals that actually carry ingredients,
  // regardless of slot name or logged flag.
  const mealsTracked = day.meals.filter((m) => m.ingredients.length > 0).length;
  const consumed = dayConsumed(day);
  const mealCount = mealsExpected > 0 && mealsTracked >= mealsExpected;
  const calories = withinTolerance(consumed.calories, day.targetCalories, CALORIE_TOLERANCE);
  const fat = withinTolerance(consumed.fat, day.targetFat, MACRO_TOLERANCE);
  const carbs = withinTolerance(consumed.carbs, day.targetCarbs, MACRO_TOLERANCE);
  const protein = withinTolerance(consumed.protein, day.targetProtein, MACRO_TOLERANCE);
  const pass = mealsTracked > 0 && mealCount && calories && fat && carbs && protein;
  return { mealCount, calories, fat, carbs, protein, pass };
}

export type GoalOutcome = 'reached' | 'missed' | null;

// Outcome of a completed user goal, judged only by the final logged weight inside
// its window (R71–R75): Cut reaches at ≤ target+2%, Lean Gain at ≥ target−2%,
// Maintain within ±2%. No in-window weight is a miss. Background/generated
// segments and not-yet-completed goals return null.
export function goalOutcome(goal: Goal, weightEntries: WeightEntry[], today: string): GoalOutcome {
  if (goal.isBackground) return null;
  if (goal.endDate == null || goal.endDate >= today) return null;
  // A goal without a weight target is just a completed phase — nothing to miss.
  if (goal.targetWeightLbs == null) return 'reached';
  const inWindow = weightEntries
    .filter((e) => (goal.startDate == null || e.date >= goal.startDate) && e.date <= goal.endDate!)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const final = inWindow.at(-1);
  if (!final) return 'missed';
  const t = goal.targetWeightLbs;
  const w = final.weightLbs;
  switch (goal.mode) {
    case 'cut':
      return w <= t * (1 + MACRO_TOLERANCE) ? 'reached' : 'missed';
    case 'lean_gain':
      return w >= t * (1 - MACRO_TOLERANCE) ? 'reached' : 'missed';
    case 'maintain':
      return Math.abs(w - t) <= t * MACRO_TOLERANCE ? 'reached' : 'missed';
  }
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
