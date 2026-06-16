import type { ScanResult } from '@leanlog/nutrition-scan';
import { describe, expect, it } from 'vitest';
import { fuzzyPass, scoreCase, scoreMicronutrients } from './scoring';
import { numericPass, toleranceFor } from './tolerance';

function actual(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    basis: 'per_serving',
    servingSizeGrams: 170,
    servingSizeUnit: 'gram',
    servingSizeText: '3/4 cup (170g)',
    servingsPerContainer: 4,
    nutrients: { calories: 150, fat: 8, saturatedFat: 1, carbs: 12, fiber: 0, protein: 11 },
    micronutrients: [],
    inferredName: 'Yogurt',
    notes: [],
    ...overrides,
  };
}

describe('numericPass (relative tolerance)', () => {
  it('passes a numeric field within the default relative band', () => {
    // AE3: protein 11.2 vs ground-truth 11 (within 2%).
    expect(numericPass(11, 11.2, toleranceFor('protein'))).toBe(true);
  });

  it('fails a numeric field outside the band', () => {
    expect(numericPass(11, 13, toleranceFor('protein'))).toBe(false);
  });

  it('uses a looser band for calories', () => {
    // 4% off: fails the 2% default but passes the 5% calories override.
    expect(numericPass(150, 156, toleranceFor('protein'))).toBe(false);
    expect(numericPass(150, 156, toleranceFor('calories'))).toBe(true);
  });

  it('requires exact zero when ground truth is zero', () => {
    expect(numericPass(0, 0, toleranceFor('fiber'))).toBe(true);
    expect(numericPass(0, 0.5, toleranceFor('fiber'))).toBe(false);
  });
});

describe('fuzzyPass', () => {
  it('matches case-insensitively and on containment', () => {
    expect(fuzzyPass('Vitamin D', 'vitamin d')).toBe(true);
    expect(fuzzyPass('Vitamin B12', 'Vitamin B12 (cobalamin)')).toBe(true);
    expect(fuzzyPass('Sodium', 'Calcium')).toBe(false);
  });
});

describe('scoreCase scalar + enum fields', () => {
  it('scores an enum field as exact match (AE3)', () => {
    const score = scoreCase({ basis: 'per_serving' }, actual({ basis: 'per_100g' }));
    expect(score.fields.find((f) => f.field === 'basis')?.pass).toBe(false);
    const ok = scoreCase({ basis: 'per_serving' }, actual({ basis: 'per_serving' }));
    expect(ok.fields.find((f) => f.field === 'basis')?.pass).toBe(true);
  });

  it('only scores fields present in ground truth', () => {
    const score = scoreCase({ basis: 'per_serving' }, actual());
    expect(score.fields).toHaveLength(1);
    expect(score.fields[0].field).toBe('basis');
  });

  it('treats null ground truth as an assertion of "unreadable"', () => {
    const pass = scoreCase({ servingSizeGrams: null }, actual({ servingSizeGrams: null }));
    expect(pass.fields[0].pass).toBe(true);
    const fail = scoreCase({ servingSizeGrams: null }, actual({ servingSizeGrams: 170 }));
    expect(fail.fields[0].pass).toBe(false);
  });

  it('scores nested nutrient fields', () => {
    const score = scoreCase(
      { nutrients: { protein: 11 } },
      actual({ nutrients: { ...actual().nutrients, protein: 11.2 } }),
    );
    expect(score.fields.find((f) => f.field === 'protein')?.pass).toBe(true);
  });
});

describe('scoreMicronutrients (R6, AE4)', () => {
  it('counts an omitted micronutrient as a miss, not silently dropped', () => {
    const score = scoreMicronutrients([{ name: 'Potassium' }], []);
    expect(score.missing).toEqual(['Potassium']);
    expect(score.matched).toHaveLength(0);
  });

  it('surfaces extra micronutrients the model invented', () => {
    const score = scoreMicronutrients(
      [{ name: 'Sodium' }],
      [
        { name: 'Sodium', amount: 95, unit: 'milligram' },
        { name: 'Iron', amount: 1, unit: 'milligram' },
      ],
    );
    expect(score.matched.map((m) => m.name)).toEqual(['Sodium']);
    expect(score.extra).toEqual(['Iron']);
  });

  it('scores amount/unit/%DV of a matched micronutrient', () => {
    const score = scoreMicronutrients(
      [{ name: 'Sodium', amount: 95, unit: 'milligram', percentDailyValue: 4 }],
      [{ name: 'Sodium', amount: 96, unit: 'gram', percentDailyValue: 4 }],
    );
    const m = score.matched[0];
    expect(m.amount).toBe('pass'); // within 2%
    expect(m.unit).toBe('fail'); // gram != milligram (enum, exact)
    expect(m.dv).toBe('pass');
  });

  it('marks an unasserted sub-field as unscored so it never counts toward a rate', () => {
    // ground truth asserts only the name → amount/unit/%DV are not scored
    const score = scoreMicronutrients(
      [{ name: 'Calcium' }],
      [{ name: 'Calcium', amount: 200, unit: 'milligram' }],
    );
    const m = score.matched[0];
    expect(m.amount).toBe('unscored');
    expect(m.unit).toBe('unscored');
    expect(m.dv).toBe('unscored');
  });

  it('accepts an omitted sub-field when ground truth is zero (0 == absent)', () => {
    // label prints "Sodium 0mg 0%"; model returns the name but omits amount + %DV
    const score = scoreMicronutrients(
      [{ name: 'Sodium', amount: 0, percentDailyValue: 0 }],
      [{ name: 'Sodium' }],
    );
    const m = score.matched[0];
    expect(m.amount).toBe('pass'); // expected 0, omitted → acceptable
    expect(m.dv).toBe('pass'); // expected 0, omitted → acceptable
  });

  it('still fails a zero-asserted sub-field when the model returns a non-zero value', () => {
    const score = scoreMicronutrients(
      [{ name: 'Sodium', percentDailyValue: 0 }],
      [{ name: 'Sodium', percentDailyValue: 6 }],
    );
    expect(score.matched[0].dv).toBe('fail');
  });
});
