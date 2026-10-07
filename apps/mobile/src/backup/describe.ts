import type { BackupCounts } from './counts';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// "14 days, 3 meals, 4 ingredients, 2 saved foods and 1 body fat result"
export function describeCounts(c: BackupCounts): string {
  const parts = [
    plural(c.days, 'day'),
    plural(c.meals, 'meal'),
    plural(c.ingredients, 'ingredient'),
    plural(c.savedFoods, 'saved food'),
    plural(c.bodyFatResults, 'body fat result'),
  ];
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
