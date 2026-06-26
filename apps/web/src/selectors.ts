import type {
  Ingredient,
  Meal,
  DailyMealLog,
  WeightEntry,
  WeeklyWeightDelta,
} from '@leanlog/data-access';
import {
  macroAccuracy,
  trackingCoverage,
  estimatedWeightLost,
  weightLossCertainty,
  contributesNutrition,
  dayMealStructure,
  vTaperRatio,
  roundVTaper,
  vTaperGapToTarget,
  V_TAPER_TARGET,
  weeklyWeightDelta,
  weeklyWeightAverages,
} from '@leanlog/data-access';
import { sum, todayIso } from './lib';

function ingredientTotals(items: Ingredient[]) {
  return {
    calories: sum(items.map((i) => i.calories)),
    fat: sum(items.map((i) => i.fat)),
    saturatedFat: sum(items.map((i) => i.saturatedFat)),
    carbs: sum(items.map((i) => i.carbs)),
    fiber: sum(items.map((i) => i.fiber)),
    protein: sum(items.map((i) => i.protein)),
  };
}

export function mealTotals(meal: Meal) {
  // Unlogged copied meals contribute zero, even with default ingredients (R25).
  return ingredientTotals(contributesNutrition(meal) ? meal.ingredients : []);
}

export function dayTotals(day: DailyMealLog) {
  // Only meals that contribute (logged template meals, or any ad-hoc meal) count
  // toward day totals (R23).
  return ingredientTotals(
    day.meals.reduce<Ingredient[]>((acc, m) => {
      if (contributesNutrition(m)) acc.push(...m.ingredients);
      return acc;
    }, []),
  );
}

function isoWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysThisWeek(days: DailyMealLog[], referenceDate?: string): DailyMealLog[] {
  const ref = referenceDate ? parseLocalDate(referenceDate) : new Date();
  const weekStart = isoWeekStart(ref);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return days.filter((d) => {
    const date = parseLocalDate(d.date);
    return date >= weekStart && date < weekEnd;
  });
}

export function daysLast90(days: DailyMealLog[], referenceDate?: string): DailyMealLog[] {
  const ref = referenceDate ? parseLocalDate(referenceDate) : new Date();
  ref.setHours(23, 59, 59, 999);
  const start = new Date(ref);
  start.setDate(start.getDate() - 89);
  start.setHours(0, 0, 0, 0);

  return days.filter((d) => {
    const date = parseLocalDate(d.date);
    return date >= start && date <= ref;
  });
}

export function todayLog(days: DailyMealLog[]): DailyMealLog | undefined {
  const today = todayIso();
  return days.find((day) => day.date === today);
}

export function trackedDatesMap(days: DailyMealLog[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const day of days) {
    map.set(day.date, day.id);
  }
  return map;
}

export function selectWeightEntries(days: DailyMealLog[]): WeightEntry[] {
  return days
    .filter((d): d is DailyMealLog & { weightLbs: number } => d.weightLbs != null)
    .map((d) => ({ date: d.date, weightLbs: d.weightLbs }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Body measurements & v-taper (#68)
// ---------------------------------------------------------------------------

export type MeasurementPoint = { date: string; value: number };

// Per-day v-taper points for the trend chart (R15): one point per day that has
// BOTH shoulder and waist, sorted chronologically. The displayed ratio is
// rounded to 2 decimals to match the day-page readout and north-star number.
export function selectVTaperEntries(days: DailyMealLog[]): MeasurementPoint[] {
  return days
    .map((d) => {
      const ratio = vTaperRatio(d.shoulderInches, d.waistInches);
      return ratio == null ? null : { date: d.date, value: roundVTaper(ratio) };
    })
    .filter((p): p is MeasurementPoint => p != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Per-day waist points for the waist trend chart (R16).
export function selectWaistEntries(days: DailyMealLog[]): MeasurementPoint[] {
  return days
    .filter((d): d is DailyMealLog & { waistInches: number } => d.waistInches != null)
    .map((d) => ({ date: d.date, value: d.waistInches }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type NorthStar = {
  currentVTaper: number; // rounded to 2 decimals for display
  target: number;
  gapToTarget: number;
  met: boolean;
};

// The current v-taper against the 1.6 north star (R7/R8). Uses the most recent
// day that has both shoulder and waist. Returns null before any such day exists
// so the Statistics card shows a prompt rather than a zero/broken ratio (R9).
// "met" is judged on the raw ratio, not the rounded display value.
export function selectNorthStar(days: DailyMealLog[]): NorthStar | null {
  const withRatio = days
    .map((d) => ({ date: d.date, ratio: vTaperRatio(d.shoulderInches, d.waistInches) }))
    .filter((d): d is { date: string; ratio: number } => d.ratio != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latest = withRatio.at(-1);
  if (!latest) return null;
  return {
    currentVTaper: roundVTaper(latest.ratio),
    target: V_TAPER_TARGET,
    gapToTarget: vTaperGapToTarget(latest.ratio),
    met: latest.ratio >= V_TAPER_TARGET,
  };
}

// The measured week-over-week weight delta (R10), null until there are enough
// weigh-ins (R12). Defaults `today` to the local date.
export function selectWeeklyWeightDelta(
  days: DailyMealLog[],
  today: string = todayIso(),
): WeeklyWeightDelta | null {
  return weeklyWeightDelta(selectWeightEntries(days), today);
}

// De-noised weekly-average weight points (Monday-dated) for the week-over-week
// trend line (R14).
export function selectWeeklyWeightEntries(days: DailyMealLog[]): WeightEntry[] {
  return weeklyWeightAverages(selectWeightEntries(days)).map((w) => ({
    date: w.weekStart,
    weightLbs: w.avgLbs,
  }));
}

export type PeriodStats = {
  accuracy: { calories: number; protein: number; carbs: number; fat: number; overall: number };
  coverage: number;
  mealsTracked: number;
  mealsExpected: number;
  estimatedWeightLost: number;
  certainty: number;
  totalCalories: number;
  targetCalories: number;
  totalProtein: number;
  targetProtein: number;
  totalCarbs: number;
  targetCarbs: number;
  totalFat: number;
  targetFat: number;
  totalFiber: number;
  totalNetCarbs: number;
};

export function aggregateStats(days: DailyMealLog[], maintenanceCalories: number): PeriodStats {
  let totalCalories = 0;
  let targetCalories = 0;
  let totalProtein = 0;
  let targetProtein = 0;
  let totalCarbs = 0;
  let targetCarbs = 0;
  let totalFat = 0;
  let targetFat = 0;
  let totalFiber = 0;
  let mealsTracked = 0;
  let mealsExpected = 0;

  for (const day of days) {
    const totals = dayTotals(day);
    totalCalories += totals.calories;
    targetCalories += day.targetCalories;
    totalProtein += totals.protein;
    targetProtein += day.targetProtein;
    totalCarbs += totals.carbs;
    targetCarbs += day.targetCarbs;
    totalFat += totals.fat;
    targetFat += day.targetFat;
    totalFiber += totals.fiber;
    // Coverage is derived per-day from its own copied/ad-hoc structure (R37–R40).
    const structure = dayMealStructure(day);
    mealsTracked += structure.mealsTracked;
    mealsExpected += structure.mealsExpected;
  }

  const totalNetCarbs = Math.max(0, totalCarbs - totalFiber);

  const calAcc = macroAccuracy(totalCalories, targetCalories);
  const protAcc = macroAccuracy(totalProtein, targetProtein);
  const carbAcc = macroAccuracy(totalCarbs, targetCarbs);
  const fatAcc = macroAccuracy(totalFat, targetFat);
  const overall = days.length > 0 ? Math.round((calAcc + protAcc + carbAcc + fatAcc) / 4) : 0;
  const coverage = trackingCoverage(mealsTracked, mealsExpected);
  const totalMaintenance = maintenanceCalories * days.length;

  return {
    accuracy: { calories: calAcc, protein: protAcc, carbs: carbAcc, fat: fatAcc, overall },
    coverage,
    mealsTracked,
    mealsExpected,
    estimatedWeightLost: estimatedWeightLost(totalCalories, totalMaintenance),
    certainty: weightLossCertainty(coverage),
    totalCalories,
    targetCalories,
    totalProtein,
    targetProtein,
    totalCarbs,
    targetCarbs,
    totalFat,
    targetFat,
    totalFiber,
    totalNetCarbs,
  };
}
