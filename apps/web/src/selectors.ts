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
  contributesNutrition,
  dayMealStructure,
  vTaperRatio,
  roundVTaper,
  vTaperGapToTarget,
  V_TAPER_TARGET,
  weeklyWeightDelta,
  weeklyWeightAverages,
  addDaysIso,
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

type CompleteSetDay = DailyMealLog & {
  shoulderInches: number;
  waistInches: number;
  bicepInches: number;
  thighInches: number;
};

// A "complete set": all four sites logged (and positive) on a single day. This is
// the qualifying weekly measurement log (#68) — partial entries don't count.
function isCompleteSet(day: DailyMealLog): day is CompleteSetDay {
  return (
    day.shoulderInches != null &&
    day.shoulderInches > 0 &&
    day.waistInches != null &&
    day.waistInches > 0 &&
    day.bicepInches != null &&
    day.bicepInches > 0 &&
    day.thighInches != null &&
    day.thighInches > 0
  );
}

export type LatestMeasurements = {
  date: string;
  shoulderInches: number;
  waistInches: number;
  bicepInches: number;
  thighInches: number;
  vTaper: number; // rounded to 2 decimals
};

// The most-recent day carrying a complete four-site set, for the collapsed weekly
// summary on the day page (#68). null until the user has logged a full set once.
export function selectLatestMeasurements(days: DailyMealLog[]): LatestMeasurements | null {
  const latest = days
    .filter(isCompleteSet)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  if (!latest) return null;
  const ratio = vTaperRatio(latest.shoulderInches, latest.waistInches);
  return {
    date: latest.date,
    shoulderInches: latest.shoulderInches,
    waistInches: latest.waistInches,
    bicepInches: latest.bicepInches,
    thighInches: latest.thighInches,
    vTaper: ratio == null ? 0 : roundVTaper(ratio),
  };
}

// Measurements are due (hard block) when no complete four-site set exists within
// the last 7 days — today and the prior 6 (#68). A brand-new user is due.
export function selectMeasurementsDue(days: DailyMealLog[], today: string = todayIso()): boolean {
  const start = addDaysIso(today, -6);
  return !days.some((d) => isCompleteSet(d) && d.date >= start && d.date <= today);
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

export function aggregateStats(days: DailyMealLog[]): PeriodStats {
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

  return {
    accuracy: { calories: calAcc, protein: protAcc, carbs: carbAcc, fat: fatAcc, overall },
    coverage,
    mealsTracked,
    mealsExpected,
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
