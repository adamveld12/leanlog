import type { CSSProperties } from 'react';

export function targetProgressColor(value: number, target?: number): string | undefined {
  if (!target || target <= 0) return undefined;
  const pctDiff = Math.abs(value - target) / target;
  return pctDiff <= 0.05
    ? 'var(--ll-saved)'
    : pctDiff <= 0.15
      ? 'var(--ll-warn)'
      : 'var(--ll-danger)';
}

export function targetProgressStyle(value: number, target?: number): CSSProperties | undefined {
  const color = targetProgressColor(value, target);
  return color ? { color } : undefined;
}
