import { describe, it, expect } from 'vitest';
import { computeTargetSize } from '../image';

describe('computeTargetSize (#54)', () => {
  const MAX = 1600;

  it('leaves an image smaller than the cap unchanged', () => {
    expect(computeTargetSize(800, 600, MAX)).toEqual({ width: 800, height: 600 });
  });

  it('does not upscale a small square', () => {
    expect(computeTargetSize(500, 500, MAX)).toEqual({ width: 500, height: 500 });
  });

  it('scales a wide landscape down so the long edge hits the cap', () => {
    expect(computeTargetSize(3200, 1800, MAX)).toEqual({ width: 1600, height: 900 });
  });

  it('scales a tall portrait down so the long edge hits the cap', () => {
    expect(computeTargetSize(1800, 3200, MAX)).toEqual({ width: 900, height: 1600 });
  });

  it('rounds fractional dimensions to whole pixels', () => {
    // 2400x1000 -> scale 1600/2400 = 0.6667; height 666.67 -> 667
    expect(computeTargetSize(2400, 1000, MAX)).toEqual({ width: 1600, height: 667 });
  });

  it('handles a square at exactly the cap', () => {
    expect(computeTargetSize(1600, 1600, MAX)).toEqual({ width: 1600, height: 1600 });
  });

  it('never produces a zero dimension for extreme aspect ratios', () => {
    const { width, height } = computeTargetSize(4000, 10, MAX);
    expect(width).toBe(1600);
    expect(height).toBeGreaterThanOrEqual(1);
  });
});
