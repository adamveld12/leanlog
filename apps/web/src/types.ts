export type {
  Ingredient,
  Meal,
  DailyMealLog,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
} from '@leanlog/data-access';

export type SaveSections = Partial<
  Record<
    | 'mealName'
    | 'ingredientForm'
    | 'bodyInfo'
    | 'calorieTarget'
    | 'macroTargets'
    | 'theme'
    | 'data',
    boolean
  >
>;
