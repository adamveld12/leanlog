import type { CSSProperties } from 'react';

// Color a calorie figure by how close it is to the target: green within 5%, warn within 15%,
// danger beyond. Lives in styles/ (not a component file) so Fast Refresh stays happy.
export function calorieColor(calories: number, calorieTarget?: number): CSSProperties | undefined {
  if (!calorieTarget || calorieTarget <= 0) return undefined;
  const pctDiff = Math.abs(calories - calorieTarget) / calorieTarget;
  const color =
    pctDiff <= 0.05 ? 'var(--ll-saved)' : pctDiff <= 0.15 ? 'var(--ll-warn)' : 'var(--ll-danger)';
  return { color };
}
