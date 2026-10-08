import { describe, expect, it } from 'vitest';
import { mobileSampleExport } from './fixtures/mobileSample';
import { MobileExportSchema, scaleSavedFood, type SavedFood } from './mobile';
import { profileTargets } from './profileTargets';

const oats: SavedFood = {
  id: 'f1',
  name: 'Oats',
  referenceGrams: 100,
  calories: 380,
  fat: 7,
  saturatedFat: 1.2,
  carbs: 67,
  fiber: 10,
  protein: 13,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

describe('scaleSavedFood', () => {
  it('scales every field from the reference amount (50 g of Oats → 190 kcal)', () => {
    const s = scaleSavedFood(oats, 50);
    expect(s.calories).toBe(190);
    expect(s.fat).toBe(3.5);
    expect(s.saturatedFat).toBe(0.6);
    expect(s.carbs).toBe(33.5);
    expect(s.fiber).toBe(5);
    expect(s.protein).toBe(6.5);
  });

  it('works for non-100 g references', () => {
    expect(scaleSavedFood({ ...oats, referenceGrams: 40 }, 100).calories).toBe(950);
  });
});

describe('MobileExportSchema', () => {
  it('accepts the shared sample fixture', () => {
    expect(MobileExportSchema.safeParse(mobileSampleExport).success).toBe(true);
  });

  it('rejects an unknown version', () => {
    expect(MobileExportSchema.safeParse({ ...mobileSampleExport, version: 2 }).success).toBe(false);
  });

  it('rejects a macro split that does not sum to 100', () => {
    const bad = {
      ...mobileSampleExport,
      profile: { ...mobileSampleExport.profile, macroFats: 50 },
    };
    expect(MobileExportSchema.safeParse(bad).success).toBe(false);
  });

  it('fixture yesterday keeps frozen 1869 kcal targets', () => {
    const yesterday = mobileSampleExport.days.find((d) => d.date === '2026-10-05');
    expect(yesterday?.targetCalories).toBe(1869);
    const p = mobileSampleExport.profile;
    expect(
      profileTargets({
        weightLbs: 180,
        bodyFatPct: 15,
        activityLevel: null,
        calorieDelta: 0,
        macroFats: p.macroFats,
        macroCarbs: p.macroCarbs,
        macroProtein: p.macroProtein,
      }).targetCalories,
    ).toBe(1869);
  });
});
