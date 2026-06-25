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
  UpdateNutritionDatabaseIngredient,
  MealTemplate,
  MealTemplateIngredient,
  CreateMealTemplate,
  UpsertTemplateIngredient,
  Goal,
  CreateGoal,
  UpdateGoal,
  UpdateBackgroundGoal,
} from './models';
import type { PhotoUpdatePatch } from './nutritionPhotos';

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
  setLogged(userId: string, mealId: string, logged: boolean): Promise<Meal>;
  delete(userId: string, mealId: string): Promise<void>;
}

// Thrown by MealRepository.delete when a caller tries to delete a meal copied
// from a template — copied meals are fixed in structure (R19).
export class TemplateMealNotDeletableError extends Error {
  constructor(mealId: string) {
    super(`Meal ${mealId} was copied from a template and cannot be deleted`);
    this.name = 'TemplateMealNotDeletableError';
  }
}

// Thrown by MealRepository.setLogged when logging a meal that has no
// ingredients — an empty meal must not count as tracked (R29).
export class EmptyMealNotLoggableError extends Error {
  constructor(mealId: string) {
    super(`Meal ${mealId} has no ingredients and cannot be logged`);
    this.name = 'EmptyMealNotLoggableError';
  }
}

export interface MealTemplateRepository {
  // Seeds the default templates exactly once per user (R2/R10); a no-op after
  // the first seed, even when the user has since deleted every template (R5).
  ensureSeeded(userId: string): Promise<void>;
  listByUser(userId: string): Promise<MealTemplate[]>;
  create(userId: string, data: CreateMealTemplate): Promise<MealTemplate>;
  rename(userId: string, templateId: string, name: string): Promise<MealTemplate>;
  delete(userId: string, templateId: string): Promise<void>;
  reorder(userId: string, orderedIds: string[]): Promise<MealTemplate[]>;
  upsertIngredient(
    userId: string,
    templateId: string,
    data: UpsertTemplateIngredient,
  ): Promise<MealTemplateIngredient | null>;
  deleteIngredient(userId: string, ingredientId: string): Promise<void>;
}

// Thrown when a template would be saved with a name that is blank or duplicates
// another of the user's templates (R4).
export class DuplicateTemplateNameError extends Error {
  constructor(name: string) {
    super(`A meal template named "${name}" already exists`);
    this.name = 'DuplicateTemplateNameError';
  }
}

export interface IngredientRepository {
  upsert(userId: string, mealId: string, data: UpsertIngredient): Promise<Ingredient | null>;
  delete(userId: string, ingredientId: string): Promise<void>;
}

export interface ProfileRepository {
  getOrCreate(clerkUserId: string): Promise<UserProfile>;
  update(clerkUserId: string, data: UpdateProfile): Promise<UserProfile>;
}

// Thrown when a user tries to edit or delete a label they did not add (#49).
// The Nutrition Facts Database is a shared catalog, so writes are ownership-gated
// and API routes map this to a 403.
export class NutritionLabelOwnershipError extends Error {
  constructor() {
    super('You can only edit or delete labels you added');
    this.name = 'NutritionLabelOwnershipError';
  }
}

// The Goals planning authority (#56). `today` is the request's local date, used
// to enforce date rules and lifecycle editability server-side. Validation
// failures throw the typed errors below, which API routes map to status codes.
export interface GoalsRepository {
  // Returns the user's background maintenance goal, creating it on first access.
  ensureBackground(userId: string): Promise<Goal>;
  // All of the user's goals, background last; user goals ordered by start date.
  listByUser(userId: string): Promise<Goal[]>;
  getById(userId: string, goalId: string): Promise<Goal | null>;
  create(userId: string, data: CreateGoal, today: string): Promise<Goal>;
  // Editing an active goal's end date is how the timeline trim (R28–R30) is
  // applied: the UI patches the active goal's end to the day before a new goal.
  update(userId: string, goalId: string, data: UpdateGoal, today: string): Promise<Goal>;
  delete(userId: string, goalId: string, today: string): Promise<void>;
  // Configure the background maintenance goal's calorie basis + body composition
  // (#63 R19/R21). Unlike the otherwise read-only background goal, these fields
  // are user-editable at any time. Ensures the background goal exists first.
  updateBackground(userId: string, data: UpdateBackgroundGoal): Promise<Goal>;
}

// A new/edited goal would overlap an existing user goal (R27). `conflictingGoalId`
// lets the UI offer the trim flow when the conflict is the active goal.
export class GoalOverlapError extends Error {
  conflictingGoalId: string;
  constructor(conflictingGoalId: string) {
    super('Goal dates overlap an existing goal');
    this.name = 'GoalOverlapError';
    this.conflictingGoalId = conflictingGoalId;
  }
}

// More than two future user goals would exist (R31).
export class TooManyFutureGoalsError extends Error {
  constructor() {
    super('At most two future goals are allowed');
    this.name = 'TooManyFutureGoalsError';
  }
}

// A goal date rule was violated: start in the past, or end not after start (R23/R26).
export class GoalDateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoalDateError';
  }
}

// An edit touched a field not allowed for the goal's lifecycle state, or targeted
// an immutable goal (past / background) (R47–R52).
export class GoalNotEditableError extends Error {
  constructor(message = 'This goal field cannot be edited in its current state') {
    super(message);
    this.name = 'GoalNotEditableError';
  }
}

// Delete attempted on a goal that is not future or today-started (R53).
export class GoalNotDeletableError extends Error {
  constructor() {
    super('Only future or today-started goals can be deleted');
    this.name = 'GoalNotDeletableError';
  }
}

export interface NutritionDatabaseRepository {
  create(
    userId: string,
    data: CreateNutritionDatabaseIngredient,
  ): Promise<NutritionDatabaseIngredient>;
  search(query: string, limit?: number): Promise<NutritionDatabaseIngredient[]>;
  // Browse the catalog newest-first without a search query (#49). Paginated so a
  // large catalog doesn't ship in one response.
  listAll(limit?: number, offset?: number): Promise<NutritionDatabaseIngredient[]>;
  getById(id: string): Promise<NutritionDatabaseIngredient | null>;
  // Returns the updated label, or null when no label has that id. Throws
  // NutritionLabelOwnershipError when the label exists but belongs to another user.
  update(
    userId: string,
    id: string,
    data: UpdateNutritionDatabaseIngredient,
  ): Promise<NutritionDatabaseIngredient | null>;
  // Sets/replaces/clears the entry's photo slots (#54). Returns the updated label
  // plus any old object keys this entry no longer references and that no other
  // entry references either, so the caller can delete those R2 objects (R9).
  // Returns null when no label has that id; throws NutritionLabelOwnershipError
  // when the label belongs to another user (R13).
  setPhotos(
    userId: string,
    id: string,
    patch: PhotoUpdatePatch,
  ): Promise<{ label: NutritionDatabaseIngredient; orphanedKeys: string[] } | null>;
  // Returns 'deleted' on success, 'not_found' when no label has that id. Throws
  // NutritionLabelOwnershipError when the label belongs to another user.
  delete(userId: string, id: string): Promise<DeleteNutritionResult>;
  count(): Promise<number>;
}

// Deleting an entry also reports which of its photo object keys are now orphaned
// (referenced by no remaining entry) so the API route can remove them from R2 (R9/AE8).
export type DeleteNutritionResult =
  | { status: 'not_found' }
  | { status: 'deleted'; orphanedKeys: string[] };
