import type {
  AddFromDatabaseMode,
  IngredientMicronutrientValue,
  NutritionDatabaseSearchResult,
} from '@leanlog/ui';
import type { Ingredient, UpsertIngredient } from '@leanlog/data-access';
import type { NutritionDatabaseIngredientSearchResult } from '../../types';
import { nutritionImageUrl } from '../../image';

// How a saved label is added to a meal (R22): by weight, servings, or package.
export type AddFromDatabaseInput = { mode: AddFromDatabaseMode; amount?: number };

type DraftNumericKey =
  | 'weight'
  | 'fat'
  | 'saturatedFat'
  | 'carbs'
  | 'fiber'
  | 'protein'
  | 'calories'
  | 'sugarAlcohol'
  | 'allulose'
  | 'alcohol';

export type IngredientDraft = Omit<
  UpsertIngredient,
  'id' | 'mealId' | 'createdAt' | 'updatedAt' | 'micronutrients' | DraftNumericKey
> & { [K in DraftNumericKey]: number | null } & {
  // Editor shape: rows may carry a %DV that is resolved to an amount on save.
  micronutrients?: IngredientMicronutrientValue[] | null;
};

export const emptyDraft: IngredientDraft = {
  name: '',
  weight: null,
  calories: null,
  fat: null,
  saturatedFat: null,
  carbs: null,
  fiber: null,
  protein: null,
  sugarAlcohol: null,
  allulose: null,
  alcohol: null,
};

export type EntryIngredient = Omit<Ingredient, 'mealId'>;

export function mapDbSearchResults(
  raw: NutritionDatabaseIngredientSearchResult[],
): NutritionDatabaseSearchResult[] {
  return raw.map((r) => ({
    id: r.id,
    name: r.name,
    servingAmount: r.servingAmount,
    servingSizeUnit: r.servingSizeUnit,
    servingsPerPackage: r.servingsPerPackage,
    fat: r.fat,
    carbs: r.carbs,
    protein: r.protein,
    fiber: r.fiber ?? null,
    calories: r.calories,
    addedByName: r.addedByName,
    addedAtLabel: new Date(r.createdAt).toLocaleDateString(),
    creationSource: r.creationSource,
    // Prefer the product photo for the list thumbnail, falling back to the
    // label photo so scanned entries still show an image (R10).
    thumbnailUrl: nutritionImageUrl(r.productPhotoKey ?? r.labelPhotoKey),
  }));
}
