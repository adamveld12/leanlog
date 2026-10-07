import type {
  BodyFatRecord,
  HeightRecord,
  NutritionRecord,
  WeightRecord,
} from 'react-native-health-connect';
import { sumNutrition } from '../state/selectors';
import { localDate } from '../state/date';

// Mirrors react-native-health-connect's constants. The package index loads its
// native module, so we keep our own copies here (mapping.test.ts checks they match).
export const MEAL_TYPE = { UNKNOWN: 0, BREAKFAST: 1, LUNCH: 2, DINNER: 3, SNACK: 4 } as const;
export const SDK_STATUS = { unavailable: 1, updateRequired: 2, available: 3 } as const;
// RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY: values the user typed in.
const MANUAL_ENTRY = 3;

type NutritionTotals = Parameters<typeof sumNutrition>[0][number];
type MealLike = { id: string; date: string; name: string; revision: number };

// Meal names are the only signal we trust; anything else is left "unknown"
// rather than mislabelled from the clock.
export function inferMealType(name: string): number {
  const n = name.trim().toLowerCase();
  if (n.includes('breakfast')) return MEAL_TYPE.BREAKFAST;
  if (n.includes('lunch')) return MEAL_TYPE.LUNCH;
  if (n.includes('dinner')) return MEAL_TYPE.DINNER;
  if (n.includes('snack')) return MEAL_TYPE.SNACK;
  return MEAL_TYPE.UNKNOWN;
}

// Meals don't store a timestamp, but their uuidv7 ids embed the creation time
// (first 48 bits, ms since the epoch). If that time isn't on the meal's own
// day (an imported meal, say) use local noon of the meal's date.
export function mealStartTime(meal: { id: string; date: string }): Date {
  const [y, m, d] = meal.date.split('-').map(Number);
  const noon = new Date(y, m - 1, d, 12, 0, 0);
  const hex = meal.id.replace(/-/g, '').slice(0, 12);
  if (!/^[0-9a-f]{12}$/i.test(hex)) return noon;
  const created = new Date(parseInt(hex, 16));
  return localDate(created) === meal.date ? created : noon;
}

const grams = (value: number) => ({ value, unit: 'grams' as const });

// One record per meal. Re-sending it with the same clientRecordId and a higher
// version (the meal's revision) updates it in place instead of duplicating it.
export function mealToNutritionRecord(
  meal: MealLike,
  ingredients: readonly NutritionTotals[],
): NutritionRecord {
  const totals = sumNutrition(ingredients);
  const start = mealStartTime(meal);
  return {
    recordType: 'Nutrition',
    name: meal.name,
    mealType: inferMealType(meal.name),
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + 60_000).toISOString(),
    energy: { value: totals.calories, unit: 'kilocalories' },
    protein: grams(totals.protein),
    totalCarbohydrate: grams(totals.carbs),
    totalFat: grams(totals.fat),
    saturatedFat: grams(totals.saturatedFat),
    dietaryFiber: grams(totals.fiber),
    metadata: { clientRecordId: `meal:${meal.id}`, clientRecordVersion: meal.revision },
  };
}

// The reading's own timestamp is the version, so re-logging later wins.
const stamped = (clientRecordId: string, at: string) => ({
  clientRecordId,
  clientRecordVersion: Date.parse(at),
  recordingMethod: MANUAL_ENTRY,
});

export function weightToRecord(
  clientRecordId: string,
  payload: { weightLbs: number; at: string },
): WeightRecord {
  return {
    recordType: 'Weight',
    time: payload.at,
    weight: { value: payload.weightLbs, unit: 'pounds' },
    metadata: stamped(clientRecordId, payload.at),
  };
}

export function bodyFatToRecord(
  clientRecordId: string,
  payload: { pct: number; at: string },
): BodyFatRecord {
  return {
    recordType: 'BodyFat',
    time: payload.at,
    percentage: payload.pct,
    metadata: stamped(clientRecordId, payload.at),
  };
}

export function heightToRecord(
  clientRecordId: string,
  payload: { heightIn: number; at: string },
): HeightRecord {
  return {
    recordType: 'Height',
    time: payload.at,
    height: { value: payload.heightIn, unit: 'inches' },
    metadata: stamped(clientRecordId, payload.at),
  };
}
