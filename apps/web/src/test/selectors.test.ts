import { describe, expect, it } from 'vitest';
import { dayTotals, mealTotals } from '../selectors';

describe('selectors', () => {
  it('sums meal totals', () => {
    const now = new Date().toISOString();
    const meal = {
      id: 'm',
      dailyMealLogId: 'd',
      name: 'X',
      createdAt: now,
      updatedAt: now,
      ingredients: [
        {
          id: '1',
          mealId: 'm',
          name: 'A',
          weight: 1,
          calories: 10,
          fat: 1,
          saturatedFat: 0,
          carbs: 2,
          fiber: 0,
          protein: 3,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: '2',
          mealId: 'm',
          name: 'B',
          weight: 1,
          calories: 20,
          fat: 2,
          saturatedFat: 0,
          carbs: 4,
          fiber: 0,
          protein: 6,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
    expect(mealTotals(meal).calories).toBe(30);
    expect(
      dayTotals({
        id: 'd',
        userId: 'u1',
        date: '2026-01-01',
        targetCalories: 2700,
        targetFat: 75,
        targetCarbs: 236,
        targetProtein: 270,
        mealCountTarget: 4,
        meals: [meal],
        createdAt: now,
        updatedAt: now,
      }).protein,
    ).toBe(9);
  });
});
