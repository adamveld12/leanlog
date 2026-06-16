// Relative-only numeric tolerance (kept deliberately simple): a field passes when the
// model's value is within `relative` fraction of ground truth. A single default with
// per-field overrides; calories gets a looser band than grams.

export type Tolerance = { relative: number };

export const DEFAULT_TOLERANCE: Tolerance = { relative: 0.02 };

// Per-field overrides keyed by the field name used in scoring (incl. the synthetic
// micronutrient keys `micronutrient.amount` / `micronutrient.percentDailyValue`).
export const FIELD_TOLERANCE: Record<string, Tolerance> = {
  calories: { relative: 0.05 },
  'micronutrient.percentDailyValue': { relative: 0.1 },
};

export function toleranceFor(field: string): Tolerance {
  return FIELD_TOLERANCE[field] ?? DEFAULT_TOLERANCE;
}

// Relative-tolerance comparison. Ground-truth zero is exact (relative tolerance is
// undefined at zero), so the model must also return zero to pass.
export function numericPass(expected: number, actual: number, tol: Tolerance): boolean {
  if (expected === 0) return actual === 0;
  return Math.abs(actual - expected) / Math.abs(expected) <= tol.relative;
}
