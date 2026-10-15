// Simple mode (#102): a notebook-and-pen view of a day as four fixed meal
// sections. Sections are a read-time projection over ordinary meals — each
// section's own food lives in an ad-hoc meal named after it, created on first
// add — so full-mode days render here without any data migration.
import { addDaysIso, contributesNutrition } from './calculations';
import type { DailyMealLog, Ingredient, Meal } from './models';

export const SIMPLE_SECTIONS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
] as const;

export type SimpleSectionKey = (typeof SIMPLE_SECTIONS)[number]['key'];

const NAME_PATTERNS: [RegExp, SimpleSectionKey][] = [
  [/^breakfast/, 'breakfast'],
  [/^lunch/, 'lunch'],
  [/^(dinner|supper)/, 'dinner'],
  [/^snack/, 'snacks'],
];

// Local-hour buckets for meals whose name doesn't say where they belong:
// before 11 → Breakfast, 11–16 → Lunch, 16–21 → Dinner, otherwise Snacks.
function sectionForHour(hour: number): SimpleSectionKey {
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snacks';
}

// When a meal was eaten: its earliest food, or the meal itself when empty.
function mealStartedAt(meal: Meal): string {
  return meal.ingredients.reduce(
    (earliest, i) => (i.createdAt < earliest ? i.createdAt : earliest),
    meal.ingredients[0]?.createdAt ?? meal.createdAt,
  );
}

export function sectionForMeal(meal: Meal): SimpleSectionKey {
  if (meal.origin === 'extra') return 'snacks';
  const name = meal.name.trim().toLowerCase();
  for (const [pattern, section] of NAME_PATTERNS) {
    if (pattern.test(name)) return section;
  }
  return sectionForHour(new Date(mealStartedAt(meal)).getHours());
}

export function sectionLabel(key: SimpleSectionKey): string {
  return SIMPLE_SECTIONS.find((s) => s.key === key)!.label;
}

// The ad-hoc meal that holds a section's own food — the only meal simple mode
// writes into. Plan meals and the Extras bucket are never write targets.
export function findSectionMeal(day: DailyMealLog, key: SimpleSectionKey): Meal | undefined {
  const label = sectionLabel(key).toLowerCase();
  return day.meals.find((m) => m.origin === 'adhoc' && m.name.trim().toLowerCase() === label);
}

export type SimpleSectionEntry = {
  mealId: string;
  ingredient: Ingredient;
  /** True only for food in the section's own meal; everything else is shown read-only. */
  editable: boolean;
};

export type SimpleSectionTotals = { calories: number; protein: number; carbs: number; fat: number };

export type SimpleSection = {
  key: SimpleSectionKey;
  label: string;
  entries: SimpleSectionEntry[];
  totals: SimpleSectionTotals;
};

// Projects a day onto the four fixed sections. Only meals that count toward the
// day's totals appear, so an unlogged plan meal's pre-filled food stays hidden.
export function groupDayIntoSections(day: DailyMealLog): SimpleSection[] {
  const sections = SIMPLE_SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    entries: [] as SimpleSectionEntry[],
    totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  }));
  const ownMealIds = new Set(
    SIMPLE_SECTIONS.map((s) => findSectionMeal(day, s.key)?.id).filter(Boolean),
  );

  for (const meal of day.meals) {
    if (!contributesNutrition(meal)) continue;
    const section = sections.find((s) => s.key === sectionForMeal(meal))!;
    const editable = ownMealIds.has(meal.id);
    for (const ingredient of meal.ingredients) {
      section.entries.push({ mealId: meal.id, ingredient, editable });
      section.totals.calories += ingredient.calories;
      section.totals.protein += ingredient.protein;
      section.totals.carbs += ingredient.carbs;
      section.totals.fat += ingredient.fat;
    }
  }
  return sections;
}

export type DayWindowEntry = { date: string; day: DailyMealLog | null };

// The trailing n calendar dates ending on `today`, oldest first, each paired
// with its logged day or null when nothing was logged that date.
export function lastNDays(days: DailyMealLog[], today: string, n: number): DayWindowEntry[] {
  const byDate = new Map(days.map((d) => [d.date, d]));
  return Array.from({ length: n }, (_, i) => {
    const date = addDaysIso(today, i - (n - 1));
    return { date, day: byDate.get(date) ?? null };
  });
}

// Per-day average across the whole window (#102): the window total divided by
// its length, so an unlogged day counts as zero rather than being skipped.
export function weekAverage(dayTotals: SimpleSectionTotals[], windowLength: number) {
  const sum = (pick: (t: SimpleSectionTotals) => number) =>
    dayTotals.reduce((acc, t) => acc + pick(t), 0) / windowLength;
  return {
    calories: sum((t) => t.calories),
    protein: sum((t) => t.protein),
    carbs: sum((t) => t.carbs),
    fat: sum((t) => t.fat),
  };
}

// Whether a new ad-hoc meal may be added to a day. Plan-backed days keep a
// fixed meal structure (R34/R36), except for simple mode's own section meals
// (#102): a simple-mode user whose day came from a plan must still be able to
// log food under Breakfast / Lunch / Dinner / Snacks.
export function canAddAdhocMeal(day: DailyMealLog, name: string): boolean {
  if (!day.meals.some((m) => m.origin === 'template')) return true;
  const normalized = name.trim().toLowerCase();
  return SIMPLE_SECTIONS.some((s) => s.label.toLowerCase() === normalized);
}
