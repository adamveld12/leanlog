import { describe, expect, it } from 'vitest';
import { migrateState } from '../state';

describe('state migration', () => {
  it('migrates legacy ingredient grams to weight', () => {
    const next = migrateState({
      version: 1,
      settings: {
        calorieTarget: 2000,
        mealCountTarget: 3,
        macroTargets: { fat: 70, saturatedFat: 20, carbs: 250, fiber: 30, protein: 140 },
        theme: 'system',
      },
      days: [
        {
          id: 'd1',
          date: '2026-01-01',
          meals: [
            {
              id: 'm1',
              name: 'LUNCH',
              ingredients: [
                {
                  id: 'i1',
                  name: 'CHICKEN',
                  grams: 120,
                  calories: 220,
                  fat: 6,
                  saturatedFat: 1.5,
                  carbs: 0,
                  fiber: 0,
                  protein: 42,
                },
              ],
            },
          ],
        },
      ],
    });

    expect(next.days[0].meals[0].ingredients[0].weight).toBe(120);
    expect(next.days[0].meals[0].ingredients[0]).not.toHaveProperty('grams');
  });

  it('throws for invalid schema', () => {
    expect(() => migrateState({ version: 2 })).toThrow('Invalid state schema. Import failed.');
  });
});
