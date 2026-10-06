import type { Sex } from './models';

// Body fat estimators for LeanLog Mobile (#75). All results are whole percents.

export const BODY_FAT_MIN = 5;
export const BODY_FAT_MAX = 50;

export type NavyInput = {
  sex: Sex;
  heightIn: number;
  neckIn: number;
  waistIn: number;
  // Required for women; ignored for men.
  hipIn?: number | null;
};

// US Navy circumference method (inches). Null when the inputs can't be
// evaluated (non-positive logs, or a woman without a hip measurement).
export function navyBodyFatPct(i: NavyInput): number | null {
  if (i.heightIn <= 0) return null;
  if (i.sex === 'male') {
    const diff = i.waistIn - i.neckIn;
    if (diff <= 0) return null;
    return Math.round(86.01 * Math.log10(diff) - 70.041 * Math.log10(i.heightIn) + 36.76);
  }
  if (i.hipIn == null) return null;
  const sum = i.waistIn + i.hipIn - i.neckIn;
  if (sum <= 0) return null;
  return Math.round(163.205 * Math.log10(sum) - 97.684 * Math.log10(i.heightIn) - 78.387);
}

// Jackson-Pollock 3-site skinfold (mm) → body density → Siri equation.
// Men: chest, abdomen, thigh. Women: triceps, suprailiac, thigh.
export function jp3BodyFatPct(
  sex: Sex,
  ageYears: number,
  sitesMm: readonly [number, number, number],
): number {
  const s = sitesMm[0] + sitesMm[1] + sitesMm[2];
  const density =
    sex === 'male'
      ? 1.10938 - 0.0008267 * s + 0.0000016 * s * s - 0.0002574 * ageYears
      : 1.0994921 - 0.0009929 * s + 0.0000023 * s * s - 0.0001392 * ageYears;
  return Math.round(495 / density - 450);
}

// Whole years between an ISO birth date and an ISO date. A Feb 29 birthday
// counts as Mar 1 in non-leap years.
export function ageOn(birthDateIso: string, onIso: string): number {
  const [by, bm, bd] = birthDateIso.split('-').map(Number);
  const [oy, om, od] = onIso.split('-').map(Number);
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

export function isUsableBodyFat(pct: number): boolean {
  return pct >= BODY_FAT_MIN && pct <= BODY_FAT_MAX;
}
