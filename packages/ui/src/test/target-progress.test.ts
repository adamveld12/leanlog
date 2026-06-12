import { describe, expect, it } from 'vitest';
import { targetProgressColor, targetProgressStyle } from '../styles/targetProgress';

describe('targetProgressColor', () => {
  it('returns saved color when within 5%', () => {
    expect(targetProgressColor(98, 100)).toBe('var(--ll-saved)');
    expect(targetProgressColor(100, 100)).toBe('var(--ll-saved)');
    expect(targetProgressColor(105, 100)).toBe('var(--ll-saved)');
  });

  it('returns warn color between 5-15%', () => {
    expect(targetProgressColor(90, 100)).toBe('var(--ll-warn)');
    expect(targetProgressColor(115, 100)).toBe('var(--ll-warn)');
  });

  it('returns danger color beyond 15%', () => {
    expect(targetProgressColor(50, 100)).toBe('var(--ll-danger)');
    expect(targetProgressColor(150, 100)).toBe('var(--ll-danger)');
  });

  it('returns undefined when no target', () => {
    expect(targetProgressColor(100)).toBeUndefined();
    expect(targetProgressColor(100, 0)).toBeUndefined();
  });
});

describe('targetProgressStyle', () => {
  it('wraps color in a CSSProperties object', () => {
    expect(targetProgressStyle(100, 100)).toEqual({ color: 'var(--ll-saved)' });
  });

  it('returns undefined when no target', () => {
    expect(targetProgressStyle(100)).toBeUndefined();
  });
});
