import type { Micronutrient, NutritionUnit } from './models';

// FDA Daily Values (2016 Nutrition Facts label; adults and children ≥4 years).
// The amount that equals 100% DV, with its unit, keyed by a normalized nutrient
// name. Used to back-compute a micronutrient amount when a label prints only the
// percent daily value (e.g. "Iron 2% DV") and no measured weight (#44). A
// measured amount is always preferred over this estimate.
export const DAILY_VALUE_REFERENCES: Record<string, { amount: number; unit: NutritionUnit }> = {
  // Electrolytes / macrominerals
  sodium: { amount: 2300, unit: 'milligram' },
  potassium: { amount: 4700, unit: 'milligram' },
  chloride: { amount: 2300, unit: 'milligram' },
  calcium: { amount: 1300, unit: 'milligram' },
  phosphorus: { amount: 1250, unit: 'milligram' },
  magnesium: { amount: 420, unit: 'milligram' },
  // Trace minerals
  iron: { amount: 18, unit: 'milligram' },
  zinc: { amount: 11, unit: 'milligram' },
  copper: { amount: 0.9, unit: 'milligram' },
  manganese: { amount: 2.3, unit: 'milligram' },
  selenium: { amount: 55, unit: 'microgram' },
  iodine: { amount: 150, unit: 'microgram' },
  chromium: { amount: 35, unit: 'microgram' },
  molybdenum: { amount: 45, unit: 'microgram' },
  // Sterol
  cholesterol: { amount: 300, unit: 'milligram' },
  // Vitamins
  'vitamin a': { amount: 900, unit: 'microgram' },
  'vitamin c': { amount: 90, unit: 'milligram' },
  'vitamin d': { amount: 20, unit: 'microgram' },
  'vitamin e': { amount: 15, unit: 'milligram' },
  'vitamin k': { amount: 120, unit: 'microgram' },
  thiamin: { amount: 1.2, unit: 'milligram' },
  riboflavin: { amount: 1.3, unit: 'milligram' },
  niacin: { amount: 16, unit: 'milligram' },
  'vitamin b6': { amount: 1.7, unit: 'milligram' },
  folate: { amount: 400, unit: 'microgram' },
  'vitamin b12': { amount: 2.4, unit: 'microgram' },
  biotin: { amount: 30, unit: 'microgram' },
  'pantothenic acid': { amount: 5, unit: 'milligram' },
  choline: { amount: 550, unit: 'milligram' },
};

// Common label spellings/abbreviations → canonical key above.
const NAME_ALIASES: Record<string, string> = {
  potas: 'potassium',
  cholest: 'cholesterol',
  'vit a': 'vitamin a',
  'vit c': 'vitamin c',
  'vit d': 'vitamin d',
  'vit e': 'vitamin e',
  'vit k': 'vitamin k',
  'vitamin b1': 'thiamin',
  thiamine: 'thiamin',
  'vitamin b2': 'riboflavin',
  'vitamin b3': 'niacin',
  'vit b6': 'vitamin b6',
  'vitamin b9': 'folate',
  'folic acid': 'folate',
  'vit b12': 'vitamin b12',
};

function canonicalName(name: string): string {
  const n = name.trim().toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ');
  return NAME_ALIASES[n] ?? n;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

// A micronutrient as read off a label: it may carry a measured amount+unit, a
// percent daily value, or both.
export type ScannedMicronutrient = {
  name: string;
  amount?: number | null;
  unit?: NutritionUnit | null;
  percentDailyValue?: number | null;
};

// Resolve a scanned micronutrient to a typed amount. Prefers an explicitly
// measured amount+unit (R: measurements over pct); otherwise back-computes from
// %DV via the DV table. Returns null when there is neither a usable measurement
// nor a known-nutrient %DV, or when the resolved amount is zero (no value to
// record).
export function resolveScannedMicronutrient(raw: ScannedMicronutrient): Micronutrient | null {
  const name = raw.name?.trim();
  if (!name) return null;
  if (raw.amount != null && raw.amount > 0 && raw.unit) {
    return { name, amount: round1(raw.amount), unit: raw.unit };
  }
  if (raw.percentDailyValue != null && raw.percentDailyValue > 0) {
    const ref = DAILY_VALUE_REFERENCES[canonicalName(name)];
    if (ref) {
      return { name, amount: round1((raw.percentDailyValue / 100) * ref.amount), unit: ref.unit };
    }
  }
  return null;
}

export function resolveScannedMicronutrients(
  raws: ScannedMicronutrient[] | null | undefined,
): Micronutrient[] {
  if (!raws) return [];
  const out: Micronutrient[] = [];
  for (const raw of raws) {
    const m = resolveScannedMicronutrient(raw);
    if (m) out.push(m);
  }
  return out;
}
