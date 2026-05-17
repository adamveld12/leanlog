export type Settings = {
  calorieTarget: number;
  mealCountTarget: number;
  macroTargets: {
    fat: number;
    saturatedFat: number;
    carbs: number;
    fiber: number;
    protein: number;
  };
  theme: 'system' | 'light' | 'dark';
};

export type Ingredient = {
  id: string;
  name: string;
  grams: number;
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  fiber: number;
  protein: number;
  libraryId?: string;
};

export type Meal = { id: string; name: string; ingredients: Ingredient[] };
export type Day = { id: string; date: string; meals: Meal[] };
export type LibraryIngredient = Ingredient & { lastUsedAt: string };

export type AppState = {
  version: 1;
  settings: Settings;
  days: Day[];
  ingredientLibrary: LibraryIngredient[];
};

export type SaveSections = Partial<
  Record<
    'mealName' | 'ingredientForm' | 'addIngredientFlow' | 'targets' | 'theme' | 'data',
    boolean
  >
>;
