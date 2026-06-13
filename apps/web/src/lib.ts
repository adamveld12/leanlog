import { format } from 'date-fns';

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const parseNum = (v: string) => (v.trim() === '' ? 0 : Number(v));
export const todayIso = () => format(new Date(), 'yyyy-MM-dd');

// A day whose local date is before today is read-only (issue #41, R21/R22).
export const isPastIso = (isoDate: string) => isoDate < todayIso();

export const normalizeIngredientName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toUpperCase();

export const ingredientDedupeKey = (name: string) => normalizeIngredientName(name).toLowerCase();

export const sum = (nums: number[]) => round1(nums.reduce((acc, n) => acc + n, 0));

export const prettyDate = (isoDate: string) => {
  const today = todayIso();
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  return format(new Date(isoDate), 'MMM d');
};
