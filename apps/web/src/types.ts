export type {
  Ingredient,
  Meal,
  DailyMealLog,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
  NutritionDatabaseIngredient,
  CreateNutritionDatabaseIngredient,
  NutritionDatabaseIngredientSearchResult,
  AddIngredientFromDatabase,
  Micronutrient,
} from '@leanlog/data-access';

export type SaveSections = Partial<
  Record<
    | 'mealName'
    | 'ingredientForm'
    | 'bodyInfo'
    | 'calorieTarget'
    | 'macroTargets'
    | 'dayWeight'
    | 'dayMeasurements'
    | 'theme'
    | 'data',
    boolean
  >
>;
