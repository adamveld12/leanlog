import { describe, it, expect } from 'vitest';
import { validateNutritionLabel, type NutritionLabelFacts } from './validation';

const facts = (over: Partial<NutritionLabelFacts>): NutritionLabelFacts => ({
  fat: 10,
  carbs: 20,
  protein: 5,
  ...over,
});

describe('validateNutritionLabel', () => {
  it('returns no errors for a consistent label', () => {
    expect(validateNutritionLabel(facts({ saturatedFat: 3, fiber: 4, sugar: 6 }))).toEqual([]);
  });

  it('treats an all-zero label as valid', () => {
    expect(validateNutritionLabel({ fat: 0, carbs: 0, protein: 0 })).toEqual([]);
  });

  it('AE7: blocks saturated fat greater than total fat and never derives unsaturated', () => {
    const errors = validateNutritionLabel(facts({ fat: 0, saturatedFat: 1 }));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ field: 'saturatedFat' });
    expect(errors[0].message).toMatch(/saturated fat/i);
  });

  it('blocks fiber greater than total carbs', () => {
    const errors = validateNutritionLabel(facts({ carbs: 5, fiber: 6 }));
    expect(errors.map((e) => e.field)).toContain('fiber');
  });

  it('blocks added sugars greater than total sugars', () => {
    const errors = validateNutritionLabel(facts({ sugar: 4, addedSugars: 5 }));
    expect(errors.map((e) => e.field)).toContain('addedSugars');
  });

  it('caps added sugars against carbs when total sugars is absent', () => {
    const errors = validateNutritionLabel(facts({ carbs: 3, addedSugars: 4 }));
    expect(errors.map((e) => e.field)).toContain('addedSugars');
  });

  it('reports every contradiction at once', () => {
    const errors = validateNutritionLabel(
      facts({ fat: 1, saturatedFat: 2, transFat: 3, carbs: 1, fiber: 5 }),
    );
    expect(errors.map((e) => e.field).sort()).toEqual(['fiber', 'saturatedFat', 'transFat']);
  });
});
