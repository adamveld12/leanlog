import type { Ingredient, Meal, DailyMealLog, WeightEntry } from '@leanlog/data-access';
import {
  macroAccuracy,
  trackingCoverage,
  estimatedWeightLost,
  weightLossCertainty,
  contributesNutrition,
  dayMealStructure,
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
  const carbAcc = macroAccuracy(totalNetCarbs, targetCarbs);
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
