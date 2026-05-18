import { describe, expect, it } from 'vitest';
import { dayTotals, mealTotals } from '../selectors';

describe('selectors', () => {
  it('sums meal totals', () => {
    const meal = {
      id: 'm',
      name: 'X',
      ingredients: [
        {
          id: '1',
          name: 'A',
          weight: 1,
          calories: 10,
          fat: 1,
          saturatedFat: 0,
          carbs: 2,
          fiber: 0,
          protein: 3,
        },
        {
          id: '2',
          name: 'B',
          weight: 1,
          calories: 20,
          fat: 2,
          saturatedFat: 0,
          carbs: 4,
          fiber: 0,
          protein: 6,
        },
      ],
    };
    expect(mealTotals(meal).calories).toBe(30);
    expect(dayTotals({ id: 'd', date: '2026-01-01', meals: [meal] }).protein).toBe(9);
  });
});
