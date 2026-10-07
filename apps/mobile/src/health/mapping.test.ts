import { uuidv7 } from '@leanlog/data-access';
import { localDate } from '../state/date';
import {
  MEAL_TYPE,
  SDK_STATUS,
  bodyFatToRecord,
  heightToRecord,
  inferMealType,
  mealStartTime,
  mealToNutritionRecord,
  weightToRecord,
} from './mapping';

const meal = { id: 'meal-1', date: '2026-10-06', name: 'Lunch', position: 1, revision: 3 };
const ingredients = [
  { calories: 260, fat: 0.6, saturatedFat: 0.2, carbs: 57, fiber: 0.8, protein: 5.4 },
  { calories: 143, fat: 9.5, saturatedFat: 3.1, carbs: 0.7, fiber: 0, protein: 12.6 },
];

describe('constants mirror react-native-health-connect', () => {
  it('matches the real MealType and SdkAvailabilityStatus values', () => {
    // constants.js doesn't load the native module, so it can be required directly.
    const real = jest.requireActual('react-native-health-connect/lib/commonjs/constants');
    expect(MEAL_TYPE).toEqual(real.MealType);
    expect(SDK_STATUS.available).toBe(real.SdkAvailabilityStatus.SDK_AVAILABLE);
    expect(SDK_STATUS.updateRequired).toBe(
      real.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED,
    );
    expect(SDK_STATUS.unavailable).toBe(real.SdkAvailabilityStatus.SDK_UNAVAILABLE);
  });
});

describe('inferMealType', () => {
  it('reads the meal name, never guessing from anything else', () => {
    expect(inferMealType('Breakfast')).toBe(MEAL_TYPE.BREAKFAST);
    expect(inferMealType('  lunch ')).toBe(MEAL_TYPE.LUNCH);
    expect(inferMealType('Dinner with Sam')).toBe(MEAL_TYPE.DINNER);
    expect(inferMealType('Snacks')).toBe(MEAL_TYPE.SNACK);
    expect(inferMealType('Pre-workout')).toBe(MEAL_TYPE.UNKNOWN);
  });
});

describe('mealStartTime', () => {
  it('uses the creation time embedded in a uuidv7 id', () => {
    const id = uuidv7();
    const date = localDate(new Date());
    const start = mealStartTime({ id, date });
    expect(Math.abs(start.getTime() - Date.now())).toBeLessThan(5_000);
  });

  it('falls back to local noon for ids without a timestamp (e.g. imported fixtures)', () => {
    const start = mealStartTime({ id: 'meal-breakfast', date: '2026-10-06' });
    expect(start).toEqual(new Date(2026, 9, 6, 12, 0, 0));
  });

  it('falls back when the id timestamp is on a different day than the meal', () => {
    const id = uuidv7();
    const start = mealStartTime({ id, date: '2020-01-01' });
    expect(start).toEqual(new Date(2020, 0, 1, 12, 0, 0));
  });
});

describe('mealToNutritionRecord', () => {
  it('maps a meal to one interval record with totals, keyed by meal id and revision', () => {
    const record = mealToNutritionRecord(meal, ingredients);
    expect(record).toMatchObject({
      recordType: 'Nutrition',
      name: 'Lunch',
      mealType: MEAL_TYPE.LUNCH,
      energy: { value: 403, unit: 'kilocalories' },
      protein: { value: 18, unit: 'grams' },
      totalCarbohydrate: { value: 57.7, unit: 'grams' },
      totalFat: { value: 10.1, unit: 'grams' },
      saturatedFat: { value: 3.3, unit: 'grams' },
      dietaryFiber: { value: 0.8, unit: 'grams' },
      metadata: { clientRecordId: 'meal:meal-1', clientRecordVersion: 3 },
    });
    const start = new Date(record.startTime).getTime();
    expect(new Date(record.endTime).getTime() - start).toBe(60_000);
  });

  it('a later edit keeps the same record id with a higher version', () => {
    const edited = mealToNutritionRecord({ ...meal, revision: 4 }, ingredients);
    expect(edited.metadata?.clientRecordId).toBe('meal:meal-1');
    expect(edited.metadata?.clientRecordVersion).toBe(4);
  });
});

describe('weight, body fat and height records', () => {
  const at = '2026-10-06T07:10:00.000Z';

  it('maps a manual weigh-in; a re-log gets a higher version from its timestamp', () => {
    const first = weightToRecord('weight:2026-10-06', { weightLbs: 181, at });
    expect(first).toMatchObject({
      recordType: 'Weight',
      time: at,
      weight: { value: 181, unit: 'pounds' },
      metadata: { clientRecordId: 'weight:2026-10-06', recordingMethod: 3 },
    });
    const later = weightToRecord('weight:2026-10-06', {
      weightLbs: 180,
      at: '2026-10-06T08:00:00.000Z',
    });
    expect(later.metadata?.clientRecordVersion).toBeGreaterThan(
      first.metadata?.clientRecordVersion ?? 0,
    );
  });

  it('maps body fat as a percentage and height in inches', () => {
    expect(bodyFatToRecord('bodyfat:x', { pct: 17, at })).toMatchObject({
      recordType: 'BodyFat',
      time: at,
      percentage: 17,
    });
    expect(heightToRecord('height:2026-10-06', { heightIn: 72, at })).toMatchObject({
      recordType: 'Height',
      height: { value: 72, unit: 'inches' },
    });
  });
});
