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
  weight: number;
  calories: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  fiber: number;
  protein: number;
};

export type Meal = { id: string; name: string; ingredients: Ingredient[] };
export type Day = { id: string; date: string; meals: Meal[] };

export type AppState = {
  version: 1;
  settings: Settings;
  days: Day[];
};

export type SaveSections = Partial<
  Record<'mealName' | 'ingredientForm' | 'targets' | 'theme' | 'data', boolean>
>;
