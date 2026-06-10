import type {
  DailyMealLog,
  Meal,
  Ingredient,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
  NutritionDatabaseIngredient,
  CreateNutritionDatabaseIngredient,
} from './models';

export interface DayRepository {
  listByUser(userId: string): Promise<DailyMealLog[]>;
  getById(userId: string, dayId: string): Promise<DailyMealLog | null>;
  create(userId: string, data: CreateDailyMealLog): Promise<DailyMealLog>;
  updateTargets(userId: string, dayId: string, targets: DayTargets): Promise<DailyMealLog>;
  getMostRecentWeightDate(userId: string): Promise<string | null>;
  delete(userId: string, dayId: string): Promise<void>;
}

export interface MealRepository {
  create(userId: string, dailyMealLogId: string, name: string): Promise<Meal>;
  rename(userId: string, mealId: string, name: string): Promise<Meal>;
  delete(userId: string, mealId: string): Promise<void>;
}

export interface IngredientRepository {
  upsert(userId: string, mealId: string, data: UpsertIngredient): Promise<Ingredient | null>;
  delete(userId: string, ingredientId: string): Promise<void>;
}

export interface ProfileRepository {
  getOrCreate(clerkUserId: string): Promise<UserProfile>;
  update(clerkUserId: string, data: UpdateProfile): Promise<UserProfile>;
}

export interface NutritionDatabaseRepository {
  create(
    userId: string,
    data: CreateNutritionDatabaseIngredient,
  ): Promise<NutritionDatabaseIngredient>;
  search(query: string, limit?: number): Promise<NutritionDatabaseIngredient[]>;
  getById(id: string): Promise<NutritionDatabaseIngredient | null>;
  count(): Promise<number>;
}
