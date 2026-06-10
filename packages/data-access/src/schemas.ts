import { z } from 'zod';

// ---------------------------------------------------------------------------
// Micronutrient
// ---------------------------------------------------------------------------

export const MicronutrientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0).optional(),
  unit: z.string().optional(),
  percentDailyValue: z.number().min(0).optional(),
});

// ---------------------------------------------------------------------------
// Nutrition Database Ingredient
// ---------------------------------------------------------------------------

export const NutritionDatabaseIngredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  servingAmount: z.number().gt(0),
  addedByUserId: z.string(),
  creationSource: z.enum(['manual', 'scan', 'meal_ingredient']),
  fat: z.number().min(0),
  carbs: z.number().min(0),
  protein: z.number().min(0),
  saturatedFat: z.number().min(0).nullable().optional(),
  unsaturatedFat: z.number().min(0).nullable().optional(),
  monounsaturatedFat: z.number().min(0).nullable().optional(),
  polyunsaturatedFat: z.number().min(0).nullable().optional(),
  transFat: z.number().min(0).nullable().optional(),
  fiber: z.number().min(0).nullable().optional(),
  sugar: z.number().min(0).nullable().optional(),
  micronutrients: z.array(MicronutrientSchema).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateNutritionDatabaseIngredientSchema = NutritionDatabaseIngredientSchema.omit({
  id: true,
  addedByUserId: true,
  createdAt: true,
  updatedAt: true,
}).strict();

export const AddIngredientFromDatabaseSchema = z
  .object({
    databaseIngredientId: z.string().uuid(),
    measuredAmount: z.number().gt(0),
  })
  .strict();

// NutritionDatabaseIngredientSearchResult is expressed as a type (not a schema)
// because calories is derived — we don't store it, we compute it.
export type NutritionDatabaseIngredientSearchResult = z.infer<
  typeof NutritionDatabaseIngredientSchema
> & {
  addedByName: string;
  calories: number;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const profileFields = {
  weightLbs: z.number().min(0),
  heightInches: z.number().min(0),
  calorieMode: z.enum(['deficit', 'maintenance', 'surplus', 'custom']),
  targetCalories: z.number().nullable(),
  macroMode: z.enum(['percentage', 'custom']),
  macroFats: z.number(),
  macroCarbs: z.number(),
  macroProtein: z.number(),
  goalWeightLbs: z.number().nullable(),
  goalBodyFatPct: z.number().nullable(),
};

export const PROFILE_DEFAULTS = {
  weightLbs: 180,
  heightInches: 72,
  calorieMode: 'maintenance' as const,
  targetCalories: null,
  macroMode: 'percentage' as const,
  macroFats: 25,
  macroCarbs: 35,
  macroProtein: 40,
  goalWeightLbs: null,
  goalBodyFatPct: null,
};

export const IngredientSchema = z.object({
  id: z.string(),
  mealId: z.string(),
  name: z.string().min(1),
  weight: z.number().min(0).max(9999),
  calories: z.number().min(0).max(9999),
  fat: z.number().min(0).max(999),
  saturatedFat: z.number().min(0).max(999),
  carbs: z.number().min(0).max(999),
  fiber: z.number().min(0).max(999),
  protein: z.number().min(0).max(999),
  // Extended optional fields
  unsaturatedFat: z.number().min(0).nullable().optional(),
  monounsaturatedFat: z.number().min(0).nullable().optional(),
  polyunsaturatedFat: z.number().min(0).nullable().optional(),
  transFat: z.number().min(0).nullable().optional(),
  sugar: z.number().min(0).nullable().optional(),
  micronutrients: z.array(MicronutrientSchema).nullable().optional(),
  sourceDatabaseIngredientId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MealSchema = z.object({
  id: z.string(),
  dailyMealLogId: z.string(),
  name: z.string(),
  ingredients: z.array(IngredientSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const DailyMealLogSchema = z.object({
  id: z.string(),
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetCalories: z.number().min(0),
  targetFat: z.number().min(0),
  targetCarbs: z.number().min(0),
  targetProtein: z.number().min(0),
  mealCountTarget: z.number().min(0).default(3),
  weightLbs: z.number().positive().nullable().default(null),
  meals: z.array(MealSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  clerkUserId: z.string(),
  weightLbs: profileFields.weightLbs.default(PROFILE_DEFAULTS.weightLbs),
  heightInches: profileFields.heightInches.default(PROFILE_DEFAULTS.heightInches),
  calorieMode: profileFields.calorieMode.default(PROFILE_DEFAULTS.calorieMode),
  targetCalories: profileFields.targetCalories.default(PROFILE_DEFAULTS.targetCalories),
  macroMode: profileFields.macroMode.default(PROFILE_DEFAULTS.macroMode),
  macroFats: profileFields.macroFats.default(PROFILE_DEFAULTS.macroFats),
  macroCarbs: profileFields.macroCarbs.default(PROFILE_DEFAULTS.macroCarbs),
  macroProtein: profileFields.macroProtein.default(PROFILE_DEFAULTS.macroProtein),
  goalWeightLbs: profileFields.goalWeightLbs.default(PROFILE_DEFAULTS.goalWeightLbs),
  goalBodyFatPct: profileFields.goalBodyFatPct.default(PROFILE_DEFAULTS.goalBodyFatPct),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Input schemas (no id/timestamps — for creates/updates)
export const CreateDailyMealLogSchema = DailyMealLogSchema.omit({
  id: true,
  userId: true,
  meals: true,
  weightLbs: true,
  createdAt: true,
  updatedAt: true,
});
// Defined from profileFields (not UserProfileSchema) so .partial() keeps missing fields
// as undefined — prevents Zod 4 defaults from overwriting existing DB values on partial updates.
export const UpdateProfileSchema = z.object(profileFields).partial();
export const UpsertIngredientSchema = IngredientSchema.omit({
  createdAt: true,
  updatedAt: true,
  calories: true,
}).strict();
export const DayTargetsSchema = z.object({
  targetCalories: z.number().min(0).optional(),
  targetFat: z.number().min(0).optional(),
  targetCarbs: z.number().min(0).optional(),
  targetProtein: z.number().min(0).optional(),
  mealCountTarget: z.number().min(0).optional(),
  weightLbs: z.number().positive().optional(),
});
