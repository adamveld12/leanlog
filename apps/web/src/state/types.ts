import type {
  DailyMealLog,
  Meal,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
  NutritionDatabaseIngredient,
  NutritionDatabaseIngredientSearchResult,
  CreateNutritionDatabaseIngredient,
  UpdateNutritionDatabaseIngredient,
  AddIngredientFromDatabase,
  MealTemplate,
  UpsertTemplateIngredient,
} from '@leanlog/data-access';

export type EnsureDayResult =
  | { status: 'found'; day: DailyMealLog }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export type Store = {
  days: DailyMealLog[];
  templates: MealTemplate[];
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  ensureDayLoaded(dayId: string): Promise<EnsureDayResult>;
  addDay(
    date: string,
    opts: Omit<CreateDailyMealLog, 'date' | 'mealCountTarget'>,
  ): Promise<DailyMealLog>;
  removeDay(dayId: string): Promise<void>;
  addMeal(dayId: string, name: string): Promise<Meal | null>;
  removeMeal(dayId: string, mealId: string): Promise<void>;
  renameMeal(dayId: string, mealId: string, name: string): Promise<void>;
  logMeal(dayId: string, mealId: string): Promise<void>;
  upsertIngredient(dayId: string, mealId: string, ingredient: UpsertIngredient): Promise<void>;
  removeIngredient(dayId: string, mealId: string, ingredientId: string): Promise<void>;
  addTemplate(name: string): Promise<MealTemplate>;
  renameTemplate(templateId: string, name: string): Promise<void>;
  removeTemplate(templateId: string): Promise<void>;
  reorderTemplates(orderedIds: string[]): Promise<void>;
  upsertTemplateIngredient(templateId: string, ingredient: UpsertTemplateIngredient): Promise<void>;
  removeTemplateIngredient(templateId: string, ingredientId: string): Promise<void>;
  addTemplateIngredientFromDatabase(
    templateId: string,
    input: AddIngredientFromDatabase,
  ): Promise<void>;
  addIngredientFromDatabase(
    dayId: string,
    mealId: string,
    input: AddIngredientFromDatabase,
  ): Promise<void>;
  searchNutritionDatabase(
    query: string,
  ): Promise<{ results: NutritionDatabaseIngredientSearchResult[]; total: number }>;
  browseNutritionDatabase(opts?: {
    limit?: number;
    offset?: number;
  }): Promise<{ results: NutritionDatabaseIngredientSearchResult[]; total: number }>;
  createNutritionDatabaseIngredient(
    input: CreateNutritionDatabaseIngredient,
  ): Promise<NutritionDatabaseIngredient>;
  updateNutritionDatabaseIngredient(
    id: string,
    input: UpdateNutritionDatabaseIngredient,
  ): Promise<NutritionDatabaseIngredient>;
  deleteNutritionDatabaseIngredient(id: string): Promise<void>;
  updateDayTargets(dayId: string, targets: DayTargets): Promise<void>;
  updateDayWeight(dayId: string, weightLbs: number): Promise<void>;
  patchProfileLocal(data: Partial<UserProfile>): void;
  updateProfile(data: UpdateProfile): Promise<void>;
};
