import { describe, expect, it } from 'vitest';
import { SCAN_PROMPT } from './prompt';
import { scanSchema } from './schema';

describe('scanSchema', () => {
  it('parses a representative label object', () => {
    const parsed = scanSchema.parse({
      basis: 'per_serving',
      servingSizeGrams: 170,
      servingSizeUnit: 'gram',
      servingSizeText: '3/4 cup (170g)',
      servingsPerContainer: 4,
      nutrients: {
        calories: 150,
        fat: 8,
        saturatedFat: 1,
        carbs: 12,
        fiber: 0,
        protein: 5,
        sugar: 11,
        addedSugars: 9,
      },
      micronutrients: [
        { name: 'Sodium', amount: 95, unit: 'milligram', percentDailyValue: 4 },
        { name: 'Calcium', percentDailyValue: 20 },
      ],
      inferredName: 'Vanilla Yogurt',
      notes: [],
    });

    expect(parsed.basis).toBe('per_serving');
    expect(parsed.nutrients.protein).toBe(5);
    expect(parsed.micronutrients).toHaveLength(2);
  });

  it('defaults micronutrients and notes to empty arrays', () => {
    const parsed = scanSchema.parse({
      basis: 'unknown',
      servingSizeGrams: null,
      servingSizeUnit: null,
      servingSizeText: null,
      servingsPerContainer: null,
      nutrients: { calories: 0, fat: 0, saturatedFat: 0, carbs: 0, fiber: 0, protein: 0 },
      inferredName: null,
    });

    expect(parsed.micronutrients).toEqual([]);
    expect(parsed.notes).toEqual([]);
  });

  it('exposes a non-empty extraction prompt', () => {
    expect(SCAN_PROMPT.length).toBeGreaterThan(0);
    expect(SCAN_PROMPT).toContain('nutrition label');
  });
});
