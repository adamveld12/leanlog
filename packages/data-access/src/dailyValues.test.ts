import { describe, it, expect } from 'vitest';
import {
  DAILY_VALUE_REFERENCES,
  resolveScannedMicronutrient,
  resolveScannedMicronutrients,
} from './dailyValues';

describe('resolveScannedMicronutrient', () => {
  it('prefers a measured amount over the %DV estimate', () => {
    // Sodium printed as 160mg AND 7% DV — keep the measurement.
    expect(
      resolveScannedMicronutrient({
        name: 'Sodium',
        amount: 160,
        unit: 'milligram',
        percentDailyValue: 7,
      }),
    ).toEqual({ name: 'Sodium', amount: 160, unit: 'milligram' });
  });

  it('back-computes amount from %DV when only the percent is printed', () => {
    // Iron 2% of 18mg = 0.36 → 0.4mg
    expect(resolveScannedMicronutrient({ name: 'Iron', percentDailyValue: 2 })).toEqual({
      name: 'Iron',
      amount: 0.4,
      unit: 'milligram',
    });
    // Potassium 2% of 4700mg = 94mg
    expect(resolveScannedMicronutrient({ name: 'Potas.', percentDailyValue: 2 })).toEqual({
      name: 'Potas.',
      amount: 94,
      unit: 'milligram',
    });
  });

  it('computes vitamin D in micrograms from %DV', () => {
    // 50% of 20mcg = 10mcg
    expect(resolveScannedMicronutrient({ name: 'Vitamin D', percentDailyValue: 50 })).toEqual({
      name: 'Vitamin D',
      amount: 10,
      unit: 'microgram',
    });
  });

  it('drops a zero measurement and a zero %DV', () => {
    expect(
      resolveScannedMicronutrient({ name: 'Cholesterol', amount: 0, unit: 'milligram' }),
    ).toBeNull();
    expect(resolveScannedMicronutrient({ name: 'Calcium', percentDailyValue: 0 })).toBeNull();
  });

  it('returns null for an unknown nutrient with only a %DV', () => {
    expect(resolveScannedMicronutrient({ name: 'Mystery', percentDailyValue: 10 })).toBeNull();
  });

  it('resolves a label list, keeping measured + computed and dropping zeros/unknowns', () => {
    const resolved = resolveScannedMicronutrients([
      { name: 'Sodium', amount: 160, unit: 'milligram', percentDailyValue: 7 },
      { name: 'Cholesterol', amount: 0, unit: 'milligram', percentDailyValue: 0 },
      { name: 'Potassium', percentDailyValue: 2 },
      { name: 'Iron', percentDailyValue: 2 },
      { name: 'Calcium', percentDailyValue: 0 },
      { name: 'Vitamin D', percentDailyValue: 0 },
    ]);
    expect(resolved).toEqual([
      { name: 'Sodium', amount: 160, unit: 'milligram' },
      { name: 'Potassium', amount: 94, unit: 'milligram' },
      { name: 'Iron', amount: 0.4, unit: 'milligram' },
    ]);
  });
});

describe('DAILY_VALUE_REFERENCES', () => {
  it('covers the common label micronutrients with sane units', () => {
    expect(DAILY_VALUE_REFERENCES.sodium).toEqual({ amount: 2300, unit: 'milligram' });
    expect(DAILY_VALUE_REFERENCES.potassium).toEqual({ amount: 4700, unit: 'milligram' });
    expect(DAILY_VALUE_REFERENCES.iron).toEqual({ amount: 18, unit: 'milligram' });
    expect(DAILY_VALUE_REFERENCES['vitamin d'].unit).toBe('microgram');
  });
});
