import type { z } from 'zod';
import type {
  IngredientSchema,
  MealSchema,
  MealTemplateSchema,
  MealTemplateIngredientSchema,
  CreateMealTemplateSchema,
  RenameMealTemplateSchema,
  ReorderMealTemplatesSchema,
  UpsertTemplateIngredientSchema,
  DailyMealLogSchema,
  UserProfileSchema,
  CreateDailyMealLogSchema,
  UpdateProfileSchema,
  UpsertIngredientSchema,
  DayTargetsSchema,
  MicronutrientSchema,
  NutritionUnitSchema,
  ServingSizeUnitSchema,
  NutritionDatabaseIngredientSchema,
  CreateNutritionDatabaseIngredientSchema,
  UpdateNutritionDatabaseIngredientSchema,
  AddIngredientFromDatabaseSchema,
  NutritionDatabaseIngredientSearchResult,
} from './schemas';

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type MealTemplate = z.infer<typeof MealTemplateSchema>;
export type MealTemplateIngredient = z.infer<typeof MealTemplateIngredientSchema>;
export type CreateMealTemplate = z.infer<typeof CreateMealTemplateSchema>;
export type RenameMealTemplate = z.infer<typeof RenameMealTemplateSchema>;
export type ReorderMealTemplates = z.infer<typeof ReorderMealTemplatesSchema>;
export type UpsertTemplateIngredient = z.infer<typeof UpsertTemplateIngredientSchema>;
export type DailyMealLog = z.infer<typeof DailyMealLogSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateDailyMealLog = z.infer<typeof CreateDailyMealLogSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type UpsertIngredient = z.infer<typeof UpsertIngredientSchema>;
export type DayTargets = z.infer<typeof DayTargetsSchema>;
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
