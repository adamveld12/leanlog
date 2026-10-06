import { mobileSampleExport } from '@leanlog/data-access/fixtures/mobileSample';
import {
  latestBodyFat,
  latestWeight,
  selectDayView,
  sumNutrition,
  type Snapshot,
} from './selectors';

const { format: _f, version: _v, exportedAt: _e, errorLog: _l, ...snapshot } = mobileSampleExport;
const data: Snapshot = snapshot;
const TODAY = '2026-10-06';

describe('selectDayView', () => {
  it("groups today's meals with ingredients and totals against frozen targets", () => {
    const view = selectDayView(data, TODAY, TODAY);
    expect(view.editable).toBe(true);
    expect(view.meals.map((m) => m.meal.name)).toEqual(['Breakfast', 'Lunch']);
    expect(view.meals[0].totals.calories).toBe(333);
    expect(view.totals.calories).toBe(333 + 260);
    expect(view.targets).toMatchObject({ calories: 2897, protein: 140, fat: 62, carbs: 444 });
  });

  it('marks past days read-only and shows the targets they ended with', () => {
    const view = selectDayView(data, '2026-10-05', TODAY);
    expect(view.editable).toBe(false);
    expect(view.targets?.calories).toBe(1869);
    expect(view.meals.map((m) => m.meal.name)).toEqual(['Dinner']);
  });

  it('returns no targets for a day with no row', () => {
    expect(selectDayView(data, '2020-01-01', TODAY).targets).toBeNull();
  });
});

describe('latest values', () => {
  it('picks the latest weight and body fat on or before a date', () => {
    expect(latestWeight(data, TODAY)).toBe(180);
    expect(latestWeight(data, '2026-09-23')).toBe(182);
    expect(latestBodyFat(data, TODAY)?.pct).toBe(15);
    expect(latestBodyFat(data, '2026-09-01')).toBeNull();
  });
});

describe('sumNutrition', () => {
  it('sums every nutrition field', () => {
    const t = sumNutrition(data.ingredients.filter((i) => i.mealId === 'meal-breakfast'));
    expect(t).toMatchObject({ calories: 333, protein: 19.1 });
  });
});
