import type { z } from 'zod';
import type {
  IngredientSchema,
  MealSchema,
  DailyMealLogSchema,
  UserProfileSchema,
  CreateDailyMealLogSchema,
  UpdateProfileSchema,
  UpsertIngredientSchema,
  AddExtraSchema,
  DayTargetsSchema,
  SetDayProgressPhotoSchema,
  SetProgressBaselineSchema,
  MicronutrientSchema,
  NutritionUnitSchema,
  ServingSizeUnitSchema,
  NutritionDatabaseIngredientSchema,
  CreateNutritionDatabaseIngredientSchema,
  UpdateNutritionDatabaseIngredientSchema,
  AddIngredientFromDatabaseSchema,
  NutritionDatabaseIngredientSearchResult,
  GoalSchema,
  GoalModeSchema,
  CalorieBasisSchema,
  ActivityLevelSchema,
  CreateGoalSchema,
  UpdateGoalSchema,
  UpdateBackgroundGoalSchema,
  PlanSchema,
  PlanSummarySchema,
  PlanMealSchema,
  PlanMealIngredientSchema,
  CreatePlanSchema,
  RenamePlanSchema,
  ReorderPlansSchema,
  CreatePlanMealSchema,
  RenamePlanMealSchema,
  ReorderPlanMealsSchema,
  UpsertPlanIngredientSchema,
} from './schemas';

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DailyMealLog = z.infer<typeof DailyMealLogSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateDailyMealLog = z.infer<typeof CreateDailyMealLogSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type UpsertIngredient = z.infer<typeof UpsertIngredientSchema>;
export type AddExtra = z.infer<typeof AddExtraSchema>;
export type DayTargets = z.infer<typeof DayTargetsSchema>;
export type SetDayProgressPhoto = z.infer<typeof SetDayProgressPhotoSchema>;
export type SetProgressBaseline = z.infer<typeof SetProgressBaselineSchema>;
export type Micronutrient = z.infer<typeof MicronutrientSchema>;
export type NutritionUnit = z.infer<typeof NutritionUnitSchema>;
export type ServingSizeUnit = z.infer<typeof ServingSizeUnitSchema>;
export type NutritionDatabaseIngredient = z.infer<typeof NutritionDatabaseIngredientSchema>;
export type CreateNutritionDatabaseIngredient = z.infer<
  typeof CreateNutritionDatabaseIngredientSchema
>;
export type UpdateNutritionDatabaseIngredient = z.infer<
  typeof UpdateNutritionDatabaseIngredientSchema
>;
export type AddIngredientFromDatabase = z.infer<typeof AddIngredientFromDatabaseSchema>;
export type { NutritionDatabaseIngredientSearchResult };

export type WeightEntry = { date: string; weightLbs: number };

export type Goal = z.infer<typeof GoalSchema>;
export type GoalMode = z.infer<typeof GoalModeSchema>;
export type CalorieBasis = z.infer<typeof CalorieBasisSchema>;
export type ActivityLevel = z.infer<typeof ActivityLevelSchema>;
export type CreateGoal = z.infer<typeof CreateGoalSchema>;
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;
export type UpdateBackgroundGoal = z.infer<typeof UpdateBackgroundGoalSchema>;

export type Plan = z.infer<typeof PlanSchema>;
export type PlanSummary = z.infer<typeof PlanSummarySchema>;
export type PlanMeal = z.infer<typeof PlanMealSchema>;
export type PlanMealIngredient = z.infer<typeof PlanMealIngredientSchema>;
export type CreatePlan = z.infer<typeof CreatePlanSchema>;
export type RenamePlan = z.infer<typeof RenamePlanSchema>;
export type ReorderPlans = z.infer<typeof ReorderPlansSchema>;
export type CreatePlanMeal = z.infer<typeof CreatePlanMealSchema>;
export type RenamePlanMeal = z.infer<typeof RenamePlanMealSchema>;
export type ReorderPlanMeals = z.infer<typeof ReorderPlanMealsSchema>;
export type UpsertPlanIngredient = z.infer<typeof UpsertPlanIngredientSchema>;
