import type { BodyFatResult, MobileExport, MobileDay, NutritionFields } from '@leanlog/data-access';

// Everything on the device that screens read. Mirrors the export file.
export type Snapshot = Omit<MobileExport, 'format' | 'version' | 'exportedAt' | 'errorLog'>;

type Ingredient = Snapshot['ingredients'][number];
type Meal = Snapshot['meals'][number];

export type Totals = NutritionFields;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function sumNutrition(items: readonly NutritionFields[]): Totals {
  const total = { calories: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, protein: 0 };
  for (const i of items) {
    total.calories += i.calories;
    total.fat += i.fat;
    total.saturatedFat += i.saturatedFat;
    total.carbs += i.carbs;
    total.fiber += i.fiber;
    total.protein += i.protein;
  }
  return {
    calories: round1(total.calories),
    fat: round1(total.fat),
    saturatedFat: round1(total.saturatedFat),
    carbs: round1(total.carbs),
    fiber: round1(total.fiber),
    protein: round1(total.protein),
  };
}

export type DayView = {
  date: string;
  day: MobileDay | null;
  // Only today is editable (R4).
  editable: boolean;
  meals: { meal: Meal; ingredients: Ingredient[]; totals: Totals }[];
  totals: Totals;
  // The targets this day has (frozen once the day is past); null if no row.
  targets: { calories: number; fat: number; carbs: number; protein: number } | null;
};

export function selectDayView(data: Snapshot, date: string, today: string): DayView {
  const day = data.days.find((d) => d.date === date) ?? null;
  const meals = data.meals
    .filter((m) => m.date === date)
    .sort((a, b) => a.position - b.position)
    .map((meal) => {
      const ingredients = data.ingredients.filter((i) => i.mealId === meal.id);
      return { meal, ingredients, totals: sumNutrition(ingredients) };
    });
  return {
    date,
    day,
    editable: date === today,
    meals,
    totals: sumNutrition(meals.flatMap((m) => m.ingredients)),
    targets: day && {
      calories: day.targetCalories,
      fat: day.targetFat,
      carbs: day.targetCarbs,
      protein: day.targetProtein,
    },
  };
}

// Latest logged weight (lb) on or before `date`.
export function latestWeight(data: Snapshot, date: string): number | null {
  let best: MobileDay | null = null;
  for (const d of data.days) {
    if (d.date <= date && d.weightLbs != null && (!best || d.date > best.date)) best = d;
  }
  return best?.weightLbs ?? null;
}

export function latestBodyFat(data: Snapshot, date: string): BodyFatResult | null {
  let best: BodyFatResult | null = null;
  for (const r of data.bodyFatResults) {
    if (
      r.date <= date &&
      (!best || r.date > best.date || (r.date === best.date && r.id > best.id))
    ) {
      best = r;
    }
  }
  return best;
}
