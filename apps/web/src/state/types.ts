import type {
  DailyMealLog,
  Meal,
  UserProfile,
  UpdateProfile,
  UpsertIngredient,
  AddExtra,
  DayTargets,
  NutritionDatabaseIngredient,
  NutritionDatabaseIngredientSearchResult,
  CreateNutritionDatabaseIngredient,
  UpdateNutritionDatabaseIngredient,
  AddIngredientFromDatabase,
  Plan,
  PlanSummary,
  PlanMeal,
  UpsertPlanIngredient,
  Goal,
  CreateGoal,
  UpdateGoal,
  UpdateBackgroundGoal,
  ProgressPose,
} from '@leanlog/data-access';

export type EnsureDayResult =
  | { status: 'found'; day: DailyMealLog }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export type EnsurePlanResult =
  | { status: 'found'; plan: Plan }
  | { status: 'not_found' }
  | { status: 'error'; error: string };

export type Store = {
  days: DailyMealLog[];
  plans: PlanSummary[];
  planDetails: Plan[];
  goals: Goal[];
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  ensureDayLoaded(dayId: string): Promise<EnsureDayResult>;
  // Creates a day for the date, deriving its targets and meal slots from the
  // covering goal and the latest known weight (#56).
  addDay(date: string): Promise<DailyMealLog>;
  removeDay(dayId: string): Promise<void>;
  addMeal(dayId: string, name: string): Promise<Meal | null>;
  removeMeal(dayId: string, mealId: string): Promise<void>;
  renameMeal(dayId: string, mealId: string, name: string): Promise<void>;
  logMeal(dayId: string, mealId: string): Promise<void>;
  upsertIngredient(dayId: string, mealId: string, ingredient: UpsertIngredient): Promise<void>;
  removeIngredient(dayId: string, mealId: string, ingredientId: string): Promise<void>;
  // Finds or creates the day's Extras bucket meal and adds a new item to it
  // (#64). Returns the full bucket meal so callers can learn its id.
  addExtra(dayId: string, data: AddExtra): Promise<Meal>;
  // Adds a nutrition-database item to the day's Extras bucket (#93). Like
  // addExtra, returns the full bucket meal so callers learn its id.
  addExtraFromDatabase(dayId: string, input: AddIngredientFromDatabase): Promise<Meal>;
  // Applies a plan to a day (R18-R27); returns how many meals were filled vs.
  // skipped so the UI can report it (R26).
  applyPlanToDay(dayId: string, planId: string): Promise<{ filled: number; skipped: number }>;
  // Loads a plan's full tree (meals + ingredients) on demand for the editor,
  // mirroring ensureDayLoaded (R41 — the summary list alone has no ingredients).
  ensurePlanLoaded(planId: string): Promise<EnsurePlanResult>;
  addPlan(name: string): Promise<Plan>;
  renamePlan(planId: string, name: string): Promise<void>;
  removePlan(planId: string): Promise<void>;
  duplicatePlan(planId: string): Promise<Plan>;
  reorderPlans(orderedIds: string[]): Promise<void>;
  addPlanMeal(planId: string, name: string): Promise<PlanMeal | null>;
  renamePlanMeal(planId: string, mealId: string, name: string): Promise<void>;
  removePlanMeal(planId: string, mealId: string): Promise<void>;
  reorderPlanMeals(planId: string, orderedIds: string[]): Promise<void>;
  upsertPlanIngredient(
    planId: string,
    mealId: string,
    ingredient: UpsertPlanIngredient,
  ): Promise<void>;
  removePlanIngredient(planId: string, mealId: string, ingredientId: string): Promise<void>;
  addPlanIngredientFromDatabase(
    planId: string,
    mealId: string,
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
  // Sets/replaces/clears an entry's photo slots; omit a field to keep it (#54).
  updateNutritionDatabasePhotos(
    id: string,
    patch: { productPhotoKey?: string | null; labelPhotoKey?: string | null },
  ): Promise<NutritionDatabaseIngredient>;
  deleteNutritionDatabaseIngredient(id: string): Promise<void>;
  updateDayTargets(dayId: string, targets: DayTargets): Promise<void>;
  updateDayWeight(dayId: string, weightLbs: number): Promise<void>;
  // Pins (key) or clears (null) one pose's progress photo for a day (#69).
  setDayProgressPhoto(dayId: string, pose: ProgressPose, key: string | null): Promise<void>;
  // Re-picks (date) or resets (null) the per-pose comparison baseline (R15).
  setProgressBaseline(pose: ProgressPose, date: string | null): Promise<void>;
  patchProfileLocal(data: Partial<UserProfile>): void;
  updateProfile(data: UpdateProfile): Promise<void>;
  createGoal(data: CreateGoal): Promise<Goal>;
  updateGoal(goalId: string, data: UpdateGoal): Promise<Goal>;
  removeGoal(goalId: string): Promise<void>;
  // Configure the background maintenance goal's calorie basis + body comp (#63).
  configureBackgroundGoal(data: UpdateBackgroundGoal): Promise<Goal>;
};
