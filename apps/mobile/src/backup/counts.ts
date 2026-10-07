import type { MobileExport } from '@leanlog/data-access';

export type BackupCounts = {
  days: number;
  meals: number;
  ingredients: number;
  savedFoods: number;
  bodyFatResults: number;
};

export function backupCounts(data: MobileExport): BackupCounts {
  return {
    days: data.days.length,
    meals: data.meals.length,
    ingredients: data.ingredients.length,
    savedFoods: data.savedFoods.length,
    bodyFatResults: data.bodyFatResults.length,
  };
}
