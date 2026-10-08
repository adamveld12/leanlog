import { describe, expect, it } from 'vitest';
import { fromDisplayLength, fromDisplayWeight, toDisplayLength, toDisplayWeight } from './units';

describe('units', () => {
  it('imperial display is the canonical value', () => {
    expect(toDisplayWeight(180, 'imperial')).toBe(180);
    expect(toDisplayLength(72, 'imperial')).toBe(72);
  });

  it('shows 82.0 kg as 180.8 lb without changing the stored value', () => {
    const storedLb = fromDisplayWeight(82.0, 'metric');
    expect(Math.round(toDisplayWeight(storedLb, 'imperial') * 10) / 10).toBe(180.8);
    expect(Math.round(toDisplayWeight(storedLb, 'metric') * 10) / 10).toBe(82.0);
  });

  it('converts inches to cm and back', () => {
    expect(toDisplayLength(72, 'metric')).toBeCloseTo(182.88, 5);
    expect(fromDisplayLength(182.88, 'metric')).toBeCloseTo(72, 5);
  });
});
