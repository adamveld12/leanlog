import { describe, expect, it } from 'vitest';
import { ingredientDedupeKey, normalizeIngredientName, round1 } from '../lib';

describe('lib', () => {
  it('normalizes names', () => {
    expect(normalizeIngredientName('  greek   yogurt ')).toBe('GREEK YOGURT');
    expect(ingredientDedupeKey('  Greek   Yogurt ')).toBe('greek yogurt');
  });

  it('rounds to 1 decimal', () => {
    expect(round1(1.234)).toBe(1.2);
    expect(round1(1.25)).toBe(1.3);
  });
});
