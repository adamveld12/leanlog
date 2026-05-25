import { z } from 'zod';

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
  meals: z.array(MealSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  clerkUserId: z.string(),
  weightLbs: z.number().min(0).default(180),
  heightInches: z.number().min(0).default(72),
  calorieMode: z.enum(['deficit', 'maintenance', 'surplus', 'custom']).default('maintenance'),
  targetCalories: z.number().nullable().default(null),
  macroMode: z.enum(['percentage', 'custom']).default('percentage'),
  macroFats: z.number().default(25),
  macroCarbs: z.number().default(35),
  macroProtein: z.number().default(40),
  goalWeightLbs: z.number().nullable().default(null),
  goalBodyFatPct: z.number().nullable().default(null),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Input schemas (no id/timestamps — for creates/updates)
export const CreateDailyMealLogSchema = DailyMealLogSchema.omit({
  id: true,
  userId: true,
  meals: true,
  createdAt: true,
  updatedAt: true,
});
export const UpdateProfileSchema = UserProfileSchema.omit({
  id: true,
  clerkUserId: true,
  createdAt: true,
  updatedAt: true,
}).partial();
export const UpsertIngredientSchema = IngredientSchema.omit({ createdAt: true, updatedAt: true });
export const DayTargetsSchema = z.object({
  targetCalories: z.number().min(0),
  targetFat: z.number().min(0),
  targetCarbs: z.number().min(0),
  targetProtein: z.number().min(0),
});
