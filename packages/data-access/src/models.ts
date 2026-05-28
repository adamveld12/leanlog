import type { z } from 'zod';
import type {
  IngredientSchema,
  MealSchema,
  DailyMealLogSchema,
  UserProfileSchema,
  CreateDailyMealLogSchema,
  UpdateProfileSchema,
  UpsertIngredientSchema,
  DayTargetsSchema,
} from './schemas';

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type DailyMealLog = z.infer<typeof DailyMealLogSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type CreateDailyMealLog = z.infer<typeof CreateDailyMealLogSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type UpsertIngredient = z.infer<typeof UpsertIngredientSchema>;
export type DayTargets = z.infer<typeof DayTargetsSchema>;

export type WeightEntry = { date: string; weightLbs: number };
