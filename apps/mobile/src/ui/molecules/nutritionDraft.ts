export type NutritionDraft = {
  calories: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbs: number | null;
  fiber: number | null;
  protein: number | null;
};

export const EMPTY_NUTRITION: NutritionDraft = {
  calories: null,
  fat: null,
  saturatedFat: null,
  carbs: null,
  fiber: null,
  protein: null,
};
