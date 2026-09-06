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
  UpsertPlanIngredient,
} from '@leanlog/data-access';

export type SaveSections = Partial<
  Record<
    | 'mealName'
    | 'planName'
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
