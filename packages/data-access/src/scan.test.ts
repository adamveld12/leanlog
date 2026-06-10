import { describe, it, expect } from 'vitest';
import { resolveScan, type ScanLabel, type ScanRequest, type DatabaseCandidate } from './scan';

const perServingLabel: ScanLabel = {
  basis: 'per_serving',
  servingSizeGrams: 30,
  servingsPerContainer: 4,
  nutrients: { calories: 120, fat: 6, saturatedFat: 1, carbs: 14, fiber: 2, protein: 3 },
  inferredName: 'Granola',
};

const per100gLabel: ScanLabel = {
  basis: 'per_100g',
  servingSizeGrams: 50,
  servingsPerContainer: 2,
  nutrients: { calories: 200, fat: 10, saturatedFat: 2, carbs: 20, fiber: 4, protein: 8 },
  inferredName: null,
};

const req = (over: Partial<ScanRequest>): ScanRequest => ({
  mode: 'weight',
  weight: 0,
  servings: 0,
  entirePackage: false,
  name: '',
  ...over,
});

describe('resolveScan', () => {
  it('scales a per-serving label by weight / serving size', () => {
    const r = resolveScan(perServingLabel, req({ mode: 'weight', weight: 60 }));
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(60);
    // factor = 60 / 30 = 2
    expect(r.proposed.calories).toBe(240);
    expect(r.proposed.protein).toBe(6);
  });

  it('scales a per-100g label by weight / 100', () => {
    const r = resolveScan(per100gLabel, req({ mode: 'weight', weight: 150 }));
    expect(r.canApply).toBe(true);
    // factor = 150 / 100 = 1.5
    expect(r.proposed.calories).toBe(300);
    expect(r.proposed.fat).toBe(15);
  });

  it('servings mode multiplies per-serving macros and computes weight', () => {
    const r = resolveScan(perServingLabel, req({ mode: 'servings', servings: 3 }));
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(90); // 30 * 3
    expect(r.proposed.calories).toBe(360); // 120 * 3
  });

  it('assumes one serving when no value is entered', () => {
    const r = resolveScan(perServingLabel, req({ mode: 'servings', servings: 0 }));
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(30);
    expect(r.proposed.calories).toBe(120);
    expect(r.notes.join(' ')).toMatch(/1 serving/i);
  });

  it('entire package uses serving size x servings-per-container', () => {
    const r = resolveScan(perServingLabel, req({ entirePackage: true }));
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(120); // 30 * 4
    expect(r.proposed.calories).toBe(480); // 120 * 4
  });

  it('entire package on a per-100g label scales by total grams / 100', () => {
    const r = resolveScan(per100gLabel, req({ entirePackage: true }));
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(100); // 50 * 2
    expect(r.proposed.calories).toBe(200); // 200 * (100/100)
  });

  it('entire package + unreadable servings-per-container falls back to one serving with a warning', () => {
    const r = resolveScan(
      { ...perServingLabel, servingsPerContainer: null },
      req({ entirePackage: true }),
    );
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(30); // one serving size
    expect(r.proposed.calories).toBe(120); // single-serving macros (factor 1)
    expect(r.warning).toMatch(/servings per container/i);
    expect(r.blockReason).toBeUndefined();
  });

  it('entire package + per-100g + unreadable servings-per-container scales one serving', () => {
    const r = resolveScan(
      { ...per100gLabel, servingsPerContainer: null },
      req({ entirePackage: true }),
    );
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(50); // one serving size
    expect(r.proposed.calories).toBe(100); // 200 * (50/100)
    expect(r.warning).toMatch(/servings per container/i);
  });

  it('blocks per-100g servings mode when serving size is unreadable', () => {
    const r = resolveScan(
      { ...per100gLabel, servingSizeGrams: null },
      req({ mode: 'servings', servings: 2 }),
    );
    expect(r.canApply).toBe(false);
    expect(r.blockReason).toMatch(/serving size unreadable/i);
  });

  it('weight mode + per-serving + null serving size keeps one-serving macros unscaled', () => {
    const r = resolveScan(
      { ...perServingLabel, servingSizeGrams: null },
      req({ mode: 'weight', weight: 200 }),
    );
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(200); // user-entered weight preserved
    expect(r.proposed.calories).toBe(120); // 1x serving, not scaled
    expect(r.notes.join(' ')).toMatch(/without scaling/i);
  });

  it('weight mode + unknown basis applies values without scaling', () => {
    const r = resolveScan(
      { ...perServingLabel, basis: 'unknown' },
      req({ mode: 'weight', weight: 75 }),
    );
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(75);
    expect(r.proposed.calories).toBe(120); // factor 1, no scaling
    expect(r.notes.join(' ')).toMatch(/basis unclear/i);
  });

  it('blocks entire package + per-serving when serving size is unreadable', () => {
    const r = resolveScan(
      { ...perServingLabel, servingSizeGrams: null },
      req({ entirePackage: true }),
    );
    expect(r.canApply).toBe(false);
    expect(r.blockReason).toMatch(/serving size unreadable/i);
  });

  it('servings mode + per-serving + null serving size proceeds with weight 0', () => {
    const r = resolveScan(
      { ...perServingLabel, servingSizeGrams: null },
      req({ mode: 'servings', servings: 3 }),
    );
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(0); // no serving size to derive a weight
    expect(r.proposed.calories).toBe(360); // macros still scale by serving count (120 * 3)
    expect(r.notes.join(' ')).toMatch(/weight left blank/i);
  });

  it('offers an inferred name only when the form name is blank', () => {
    expect(resolveScan(perServingLabel, req({ weight: 30, name: '' })).proposed.name).toBe(
      'Granola',
    );
    expect(
      resolveScan(perServingLabel, req({ weight: 30, name: 'My oats' })).proposed.name,
    ).toBeUndefined();
  });
});

describe('resolveScan — databaseCandidate', () => {
  it('per-serving scan with inferred name yields a database candidate', () => {
    // perServingLabel has inferredName 'Granola', servingSizeGrams 30
    const r = resolveScan(perServingLabel, req({ mode: 'weight', weight: 60, name: '' }));
    expect(r.databaseCandidate).not.toBeNull();
    const c = r.databaseCandidate as DatabaseCandidate;
    expect(c.name).toBe('Granola');
    expect(c.servingAmount).toBe(30);
    expect(c.fat).toBe(6);
    expect(c.carbs).toBe(14);
    expect(c.protein).toBe(3);
  });

  it('per-serving scan with user-provided name uses user name in candidate', () => {
    const r = resolveScan(perServingLabel, req({ mode: 'weight', weight: 30, name: 'My Granola' }));
    expect(r.databaseCandidate).not.toBeNull();
    expect((r.databaseCandidate as DatabaseCandidate).name).toBe('My Granola');
  });

  it('per-100g scan with known serving size yields candidate with that serving amount', () => {
    // per100gLabel has servingSizeGrams 50, nutrients per 100g: fat 10, carbs 20, protein 8
    // expected at 50g: fat = 5, carbs = 10, protein = 4
    const r = resolveScan(per100gLabel, req({ mode: 'weight', weight: 100, name: 'Oats' }));
    expect(r.databaseCandidate).not.toBeNull();
    const c = r.databaseCandidate as DatabaseCandidate;
    expect(c.servingAmount).toBe(50);
    expect(c.fat).toBe(5);
    expect(c.carbs).toBe(10);
    expect(c.protein).toBe(4);
  });

  it('per-100g scan without serving size yields candidate with servingAmount 100 and unscaled macros', () => {
    const labelNoServing: ScanLabel = {
      ...per100gLabel,
      servingSizeGrams: null,
      inferredName: 'Rice',
    };
    const r = resolveScan(labelNoServing, req({ mode: 'weight', weight: 100, name: '' }));
    expect(r.databaseCandidate).not.toBeNull();
    const c = r.databaseCandidate as DatabaseCandidate;
    expect(c.servingAmount).toBe(100);
    expect(c.fat).toBe(10);
    expect(c.carbs).toBe(20);
    expect(c.protein).toBe(8);
  });

  it('missing protein → no candidate + databaseBlockReason mentions protein, apply still possible', () => {
    const labelNoProtein: ScanLabel = {
      ...perServingLabel,
      nutrients: { ...perServingLabel.nutrients, protein: -1 },
    };
    const r = resolveScan(labelNoProtein, req({ mode: 'weight', weight: 30, name: 'Granola' }));
    expect(r.databaseCandidate).toBeNull();
    expect(r.databaseBlockReason).toMatch(/protein/i);
    // meal-apply behavior unchanged
    expect(r.canApply).toBe(true);
    expect(r.proposed.weight).toBe(30);
  });

  it('unknown basis → no databaseCandidate and no databaseBlockReason', () => {
    const unknownLabel: ScanLabel = { ...perServingLabel, basis: 'unknown' };
    const r = resolveScan(unknownLabel, req({ mode: 'weight', weight: 75, name: 'Mystery food' }));
    expect(r.databaseCandidate).toBeUndefined();
    expect(r.databaseBlockReason).toBeUndefined();
    // existing meal-apply still possible for unknown basis with weight
    expect(r.canApply).toBe(true);
  });

  it('per-serving with null serving size → no candidate with block reason', () => {
    const labelNoServing: ScanLabel = { ...perServingLabel, servingSizeGrams: null };
    const r = resolveScan(labelNoServing, req({ mode: 'weight', weight: 30, name: 'Granola' }));
    expect(r.databaseCandidate).toBeNull();
    expect(r.databaseBlockReason).toMatch(/serving size/i);
  });

  it('per-serving with no name and no inferred name → no candidate', () => {
    const labelNoName: ScanLabel = { ...perServingLabel, inferredName: null };
    const r = resolveScan(labelNoName, req({ mode: 'weight', weight: 30, name: '' }));
    expect(r.databaseCandidate).toBeNull();
    expect(r.databaseBlockReason).toMatch(/name/i);
  });

  it('candidate includes optional saturatedFat and fiber when present', () => {
    const r = resolveScan(perServingLabel, req({ mode: 'weight', weight: 30, name: 'Granola' }));
    const c = r.databaseCandidate as DatabaseCandidate;
    expect(c.saturatedFat).toBe(1);
    expect(c.fiber).toBe(2);
  });

  it('candidate includes sugar when label nutrients provide it', () => {
    const labelWithSugar: ScanLabel = {
      ...perServingLabel,
      nutrients: { ...perServingLabel.nutrients, sugar: 5 },
    };
    const r = resolveScan(labelWithSugar, req({ mode: 'weight', weight: 30, name: 'Granola' }));
    const c = r.databaseCandidate as DatabaseCandidate;
    expect(c.sugar).toBe(5);
  });
});
