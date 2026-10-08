import { describe, expect, it } from 'vitest';
import { ageOn, isUsableBodyFat, jp3BodyFatPct, navyBodyFatPct } from './bodyFat';

describe('navyBodyFatPct', () => {
  it('computes a male reference case (72/15/34 → 17%)', () => {
    expect(navyBodyFatPct({ sex: 'male', heightIn: 72, neckIn: 15, waistIn: 34 })).toBe(17);
  });

  it('computes a female reference case (65/13/30/40 → 31%)', () => {
    expect(
      navyBodyFatPct({ sex: 'female', heightIn: 65, neckIn: 13, waistIn: 30, hipIn: 40 }),
    ).toBe(31);
  });

  it('returns null when waist is not larger than neck for men', () => {
    expect(navyBodyFatPct({ sex: 'male', heightIn: 72, neckIn: 15, waistIn: 15 })).toBeNull();
    expect(navyBodyFatPct({ sex: 'male', heightIn: 72, neckIn: 16, waistIn: 15 })).toBeNull();
  });

  it('returns null for a woman without hip', () => {
    expect(navyBodyFatPct({ sex: 'female', heightIn: 65, neckIn: 13, waistIn: 30 })).toBeNull();
    expect(
      navyBodyFatPct({ sex: 'female', heightIn: 65, neckIn: 13, waistIn: 30, hipIn: null }),
    ).toBeNull();
  });

  it('returns null for non-positive height', () => {
    expect(navyBodyFatPct({ sex: 'male', heightIn: 0, neckIn: 15, waistIn: 34 })).toBeNull();
  });
});

describe('jp3BodyFatPct', () => {
  it('computes a male reference case (age 35, 30 mm → 10%)', () => {
    expect(jp3BodyFatPct('male', 35, [8, 12, 10])).toBe(10);
  });

  it('computes a female reference case (age 30, 47 mm → 20%)', () => {
    expect(jp3BodyFatPct('female', 30, [15, 12, 20])).toBe(20);
  });
});

describe('ageOn', () => {
  it('counts whole years across a birthday', () => {
    expect(ageOn('1991-01-01', '2026-10-06')).toBe(35);
    expect(ageOn('1991-10-06', '2026-10-05')).toBe(34);
    expect(ageOn('1991-10-06', '2026-10-06')).toBe(35);
  });

  it('treats a Feb 29 birthday as Mar 1 in non-leap years', () => {
    expect(ageOn('2000-02-29', '2025-02-28')).toBe(24);
    expect(ageOn('2000-02-29', '2025-03-01')).toBe(25);
    expect(ageOn('2000-02-29', '2024-02-29')).toBe(24);
  });
});

describe('isUsableBodyFat', () => {
  it('accepts 5–50% inclusive', () => {
    expect(isUsableBodyFat(4)).toBe(false);
    expect(isUsableBodyFat(5)).toBe(true);
    expect(isUsableBodyFat(50)).toBe(true);
    expect(isUsableBodyFat(51)).toBe(false);
  });
});
