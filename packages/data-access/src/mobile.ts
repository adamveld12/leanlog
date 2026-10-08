import { z } from 'zod';
import { ActivityLevelSchema, SexSchema } from './schemas';

// LeanLog Mobile on-device entities and the versioned JSON export format (#75).
// Weights are stored in lb and lengths in inches (see units.ts).

const nonNeg = z.number().min(0);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nullableNonNeg = nonNeg.nullable();

export const NutritionFieldsSchema = z.object({
  calories: nonNeg,
  fat: nonNeg,
  saturatedFat: nonNeg,
  carbs: nonNeg,
  fiber: nonNeg,
  protein: nonNeg,
});
export type NutritionFields = z.infer<typeof NutritionFieldsSchema>;

export const SavedFoodSchema = NutritionFieldsSchema.extend({
  id: z.string().min(1),
  name: z.string().min(1),
  // Nutrition values are for this many grams (e.g. 100).
  referenceGrams: z.number().gt(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type SavedFood = z.infer<typeof SavedFoodSchema>;

export const BodyFatMethodSchema = z.enum(['navy', 'jp3']);

export const BodyFatResultSchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  pct: z.number().int().min(5).max(50),
  method: BodyFatMethodSchema,
  inputs: z.record(z.string(), z.number()),
});
export type BodyFatResult = z.infer<typeof BodyFatResultSchema>;

export const MobileProfileSchema = z
  .object({
    sex: SexSchema.nullable(),
    heightIn: z.number().gt(0).nullable(),
    birthDate: isoDate.nullable(),
    onboardingWeightLbs: z.number().gt(0).nullable(),
    activityLevel: ActivityLevelSchema.nullable(),
    calorieDelta: z.number().int(),
    macroFats: nonNeg,
    macroCarbs: nonNeg,
    macroProtein: nonNeg,
  })
  .refine((p) => Math.round(p.macroFats + p.macroCarbs + p.macroProtein) === 100, {
    message: 'Macro split must sum to 100',
  });
export type MobileProfile = z.infer<typeof MobileProfileSchema>;

export const MobileSettingsSchema = z.object({
  units: z.enum(['imperial', 'metric']),
  analyticsOptIn: z.boolean(),
  hcEnabled: z.boolean(),
});

export const MobileDaySchema = z.object({
  date: isoDate,
  targetCalories: nonNeg,
  targetFat: nonNeg,
  targetCarbs: nonNeg,
  targetProtein: nonNeg,
  basis: z.enum(['katch', 'bodyweight']),
  weightLbs: z.number().gt(0).nullable(),
  weightSource: z.enum(['manual', 'hc']).nullable(),
  weightAt: z.string().nullable(),
  shoulderIn: nullableNonNeg,
  waistIn: nullableNonNeg,
  bicepIn: nullableNonNeg,
  thighIn: nullableNonNeg,
  neckIn: nullableNonNeg,
  hipIn: nullableNonNeg,
});
export type MobileDay = z.infer<typeof MobileDaySchema>;

export const MobileMealSchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  name: z.string().min(1),
  position: z.number().int().min(0),
  // Bumped on every edit; used as the Health Connect clientRecordVersion.
  revision: z.number().int().min(0),
});

export const MobileIngredientSchema = NutritionFieldsSchema.extend({
  id: z.string().min(1),
  mealId: z.string().min(1),
  name: z.string().min(1),
  grams: nonNeg,
  // Provenance only; values are copied, never linked (R8).
  savedFoodId: z.string().nullable(),
});

export const ErrorLogEntrySchema = z.object({
  id: z.string().min(1),
  at: z.string(),
  source: z.string(),
  message: z.string(),
});

export const MobileExportSchema = z.object({
  format: z.literal('leanlog-mobile'),
  version: z.literal(1),
  exportedAt: z.string(),
  profile: MobileProfileSchema,
  settings: MobileSettingsSchema,
  days: z.array(MobileDaySchema),
  meals: z.array(MobileMealSchema),
  ingredients: z.array(MobileIngredientSchema),
  savedFoods: z.array(SavedFoodSchema),
  bodyFatResults: z.array(BodyFatResultSchema),
  errorLog: z.array(ErrorLogEntrySchema),
});
export type MobileExport = z.infer<typeof MobileExportSchema>;

const round1 = (n: number) => Math.round(n * 10) / 10;

// Scale a saved food's nutrition from its reference amount to `grams` (R7),
// rounded to 1 dp. The result is a plain value copy (snapshot-on-copy, R8).
export function scaleSavedFood(food: SavedFood, grams: number): NutritionFields {
  const k = grams / food.referenceGrams;
  return {
    calories: round1(food.calories * k),
    fat: round1(food.fat * k),
    saturatedFat: round1(food.saturatedFat * k),
    carbs: round1(food.carbs * k),
    fiber: round1(food.fiber * k),
    protein: round1(food.protein * k),
  };
}
