import { describe, it, expect } from 'vitest';
import { resolveScan, type ScanLabel, type ScanRequest } from './scan';

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

  it('blocks entire package when servings-per-container is unreadable', () => {
    const r = resolveScan(
      { ...perServingLabel, servingsPerContainer: null },
      req({ entirePackage: true }),
    );
    expect(r.canApply).toBe(false);
    expect(r.blockReason).toMatch(/servings per container/i);
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

  it('offers an inferred name only when the form name is blank', () => {
    expect(resolveScan(perServingLabel, req({ weight: 30, name: '' })).proposed.name).toBe(
      'Granola',
    );
    expect(
      resolveScan(perServingLabel, req({ weight: 30, name: 'My oats' })).proposed.name,
    ).toBeUndefined();
  });
});
