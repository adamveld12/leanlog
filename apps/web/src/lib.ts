import { format } from 'date-fns';
import { resolveScannedMicronutrients, type NutritionUnit } from '@leanlog/data-access';

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const todayIso = () => format(new Date(), 'yyyy-MM-dd');

// A day whose local date is before today is read-only (issue #41, R21/R22).
export const isPastIso = (isoDate: string) => isoDate < todayIso();

export const normalizeIngredientName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toUpperCase();

export const ingredientDedupeKey = (name: string) => normalizeIngredientName(name).toLowerCase();

export const sum = (nums: number[]) => round1(nums.reduce((acc, n) => acc + n, 0));

// `new Date('2026-05-21')` parses a date-only string as UTC midnight, which
// `format()` then renders in local time — a timezone behind UTC rolls it back
// to the previous day. Build the Date from local-time components instead so
// the calendar date always matches the ISO string, regardless of the runtime's
// UTC offset.
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export const prettyDate = (isoDate: string) => {
  const today = todayIso();
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  return format(parseLocalDate(isoDate), 'MMM d');
};

export function isoToParts(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return { year, month, day };
}

export function partsToIso({ year, month, day }: { year: number; month: number; day: number }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Resolve the manual-entry micronutrient rows (which may carry a %DV) into typed
// amounts: a measured amount wins; otherwise the %DV is converted via the Daily
// Value table. Empty / unknown-with-only-%DV rows are dropped. Shared by
// MealEditPage and PlanMealEditPage.
export function resolveDraftMicronutrients(
  micros:
    | { name: string; amount?: number | null; unit?: string; percentDailyValue?: number | null }[]
    | null
    | undefined,
) {
  return resolveScannedMicronutrients(
    micros?.map((m) => ({
      name: m.name,
      amount: m.amount ?? undefined,
      unit: (m.unit as NutritionUnit | undefined) ?? undefined,
      percentDailyValue: m.percentDailyValue ?? undefined,
    })),
  );
}
