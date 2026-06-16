import { z } from 'zod';

// ---------------------------------------------------------------------------
// Nutrition units (#44)
// ---------------------------------------------------------------------------

// Typed units for micronutrients. Percent Daily Value is intentionally not a
// unit and is never persisted (R4).
export const NutritionUnitSchema = z.enum([
  'gram',
  'milligram',
  'microgram',
  'milliliter',
  'international_unit',
]);

// A nutrition label's metric serving size normalizes to grams or milliliters
// for scaling (R9). Default is grams.
export const ServingSizeUnitSchema = z.enum(['gram', 'milliliter']);

// ---------------------------------------------------------------------------
// Micronutrient
// ---------------------------------------------------------------------------

// A typed nutrient amount (R3). %DV is no longer accepted; extra keys are
// stripped by Zod so legacy payloads carrying percentDailyValue still parse.
export const MicronutrientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().min(0),
  unit: NutritionUnitSchema,
});

// Legacy micronutrient rows (pre-#44) stored a free-text unit and a
// percentDailyValue. Normalize them on read so older meal-ingredient JSON still
// deserializes into the typed shape: map known unit strings, default unknowns to
// milligram, coerce a missing amount to 0, and drop %DV.
const LEGACY_UNIT_MAP: Record<string, z.infer<typeof NutritionUnitSchema>> = {
  g: 'gram',
  gram: 'gram',
  grams: 'gram',
  mg: 'milligram',
  milligram: 'milligram',
  milligrams: 'milligram',
  mcg: 'microgram',
  ug: 'microgram',
  µg: 'microgram',
  microgram: 'microgram',
  micrograms: 'microgram',
  ml: 'milliliter',
  milliliter: 'milliliter',
  milliliters: 'milliliter',
  iu: 'international_unit',
  international_unit: 'international_unit',
};

export function normalizeMicronutrients(
  value: unknown,
): z.infer<typeof MicronutrientSchema>[] | null {
  if (value == null || !Array.isArray(value)) return null;
  const out: z.infer<typeof MicronutrientSchema>[] = [];
  for (const raw of value) {
    if (raw == null || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === 'string' ? r.name : '';
    if (!name) continue;
    const rawUnit = typeof r.unit === 'string' ? r.unit.trim().toLowerCase() : '';
    const unit = LEGACY_UNIT_MAP[rawUnit] ?? 'milligram';
    const amount = typeof r.amount === 'number' && Number.isFinite(r.amount) ? r.amount : 0;
    out.push({ name, amount, unit });
  }
  return out;
}

// Resilient reader for the stored micronutrients_json column: tolerates a
// malformed JSON string (returns null rather than throwing, so one bad row
// never crashes an ingredient/label/template read) and normalizes legacy shapes.
export function parseMicronutrientsJson(
  json: string | null | undefined,
): z.infer<typeof MicronutrientSchema>[] | null {
  if (json == null) return null;
  try {
    return normalizeMicronutrients(JSON.parse(json));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Nutrition Database Ingredient
// ---------------------------------------------------------------------------

// A saved nutrition label (#44). `servingAmount` + `servingSizeUnit` are the
// metric serving size; `servingsPerPackage` is required so package scaling and
// the stricter database scanner have what they need (R8/R17). `sugar` is the
// label's total sugars; `addedSugars` is a distinct sub-value (R2).
export const NutritionDatabaseIngredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  servingAmount: z.number().gt(0),
  servingSizeUnit: ServingSizeUnitSchema.default('gram'),
  servingSizeDisplayText: z.string().nullable().optional(),
  servingsPerPackage: z.number().gt(0),
  addedByUserId: z.string(),
  creationSource: z.enum(['manual', 'scan']),
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
  addedSugars: z.number().min(0).nullable().optional(),
  calories: z.number().min(0),
  sugarAlcohol: z.number().min(0).nullable().optional(),
  allulose: z.number().min(0).nullable().optional(),
  alcohol: z.number().min(0).nullable().optional(),
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

// Editing an existing label (#49). Same shape as create minus the immutable
// fields: `creationSource` is fixed at capture time (it records whether the
// label was scanned or typed) and `addedByUserId` is the owner; neither can be
// changed by an edit. Server still re-runs validateNutritionLabel on the result.
export const UpdateNutritionDatabaseIngredientSchema = NutritionDatabaseIngredientSchema.omit({
  id: true,
  addedByUserId: true,
  creationSource: true,
  createdAt: true,
  updatedAt: true,
}).strict();

// How a saved label is scaled into a meal ingredient (R22): by consumed weight,
// by a number of servings, or by the entire package. `amount` carries the
// weight (grams/ml) or serving count; it is unused (and ignored) for 'package'.
export const AddIngredientFromDatabaseSchema = z
  .object({
    databaseIngredientId: z.string().uuid(),
    mode: z.enum(['weight', 'servings', 'package']),
    amount: z.number().gt(0).optional(),
  })
  .strict()
  .refine((v) => v.mode === 'package' || (v.amount != null && v.amount > 0), {
    message: 'amount is required for weight and servings modes',
    path: ['amount'],
  });

export type NutritionDatabaseIngredientSearchResult = z.infer<
  typeof NutritionDatabaseIngredientSchema
> & {
  addedByName: string;
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
  sugarAlcohol: z.number().min(0).nullable().optional(),
  allulose: z.number().min(0).nullable().optional(),
  alcohol: z.number().min(0).nullable().optional(),
  calorieSource: z.enum(['explicit', 'estimated']),
  estimatedCalories: z.number().min(0),
  micronutrients: z.array(MicronutrientSchema).nullable().optional(),
  sourceDatabaseIngredientId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const MealSchema = z.object({
  id: z.string(),
  dailyMealLogId: z.string(),
  name: z.string(),
  // origin distinguishes meals copied from a template (fixed structure, logged
  // gating) from freeform ad-hoc meals. logged controls whether a template meal
  // contributes to day totals and tracking coverage. See issue #41.
  origin: z.enum(['template', 'adhoc']).default('adhoc'),
  logged: z.boolean().default(false),
  ingredients: z.array(IngredientSchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// ---------------------------------------------------------------------------
// Meal templates (user-level routine copied into each new day — issue #41)
// ---------------------------------------------------------------------------

// Template ingredients follow the exact same validity rules as meal ingredients
// (R8), differing only in their parent reference (templateId instead of mealId).
export const MealTemplateIngredientSchema = IngredientSchema.omit({ mealId: true }).extend({
  templateId: z.string(),
});

export const MealTemplateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string().min(1),
  position: z.number().int().min(0),
  ingredients: z.array(MealTemplateIngredientSchema).default([]),
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
  calorieSource: true,
  estimatedCalories: true,
})
  .extend({
    calories: z.number().min(0).max(9999).nullable().optional(),
  })
  .strict();
export const CreateMealTemplateSchema = z
  .object({
    name: z.string().min(1),
  })
  .strict();
export const RenameMealTemplateSchema = z
  .object({
    name: z.string().min(1),
  })
  .strict();
export const ReorderMealTemplatesSchema = z
  .object({
    orderedIds: z.array(z.string()),
  })
  .strict();
export const UpsertTemplateIngredientSchema = MealTemplateIngredientSchema.omit({
  createdAt: true,
  updatedAt: true,
  calories: true,
  calorieSource: true,
  estimatedCalories: true,
})
  .extend({
    calories: z.number().min(0).max(9999).nullable().optional(),
  })
  .strict();
export const DayTargetsSchema = z.object({
  targetCalories: z.number().min(0).optional(),
  targetFat: z.number().min(0).optional(),
  targetCarbs: z.number().min(0).optional(),
  targetProtein: z.number().min(0).optional(),
  mealCountTarget: z.number().min(0).optional(),
  weightLbs: z.number().positive().optional(),
});

// ---------------------------------------------------------------------------
// Goals (#56) — the target-planning authority that replaces Profile.
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// One of the three planning phases. Cut/Maintain/Lean Gain map to fixed
// latest-weight multipliers (10x/15x/16x) in calculations (R16).
export const GoalModeSchema = z.enum(['cut', 'maintain', 'lean_gain']);

// A meal slot is a named structure copied into each new day in the goal window
// (R13/R57/R58). Slots may carry optional default ingredients that are snapshot
// into the day's meal on creation (folds in the old meal-template seeding).
export const MealSlotIngredientSchema = IngredientSchema.omit({
  mealId: true,
  createdAt: true,
  updatedAt: true,
});

export const MealSlotSchema = z.object({
  name: z.string().min(1),
  ingredients: z.array(MealSlotIngredientSchema).default([]),
});

// The default four slots applied to every new goal (R7/R14/R56).
export const DEFAULT_MEAL_SLOTS: z.infer<typeof MealSlotSchema>[] = [
  { name: 'Breakfast', ingredients: [] },
  { name: 'Lunch', ingredients: [] },
  { name: 'Dinner', ingredients: [] },
  { name: 'Snack', ingredients: [] },
];

export const GOAL_DEFAULTS = {
  mode: 'maintain' as const,
  macroFats: 25,
  macroCarbs: 35,
  macroProtein: 40,
  calorieDelta: 0,
};

export const GoalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  // The background maintenance goal supplies fallback targets and is the only
  // goal allowed null start/end dates (R6/R8/R24).
  isBackground: z.boolean().default(false),
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  mode: GoalModeSchema,
  // Required for user goals (R11); null for the background goal until a weight
  // is known, where it resolves to the latest logged weight or 180 (R7/R63).
  targetWeightLbs: z.number().positive().nullable(),
  macroFats: z.number().min(0).max(100),
  macroCarbs: z.number().min(0).max(100),
  macroProtein: z.number().min(0).max(100),
  startDate: z.string().regex(ISO_DATE).nullable(),
  endDate: z.string().regex(ISO_DATE).nullable(),
  // Active-goal-only calorie adjustment, default 0 (R20/R21).
  calorieDelta: z.number().int().default(0),
  mealSlots: z.array(MealSlotSchema).default(DEFAULT_MEAL_SLOTS),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Macro percentages must total 100 (R12). Shared by create/update refinements.
const macrosSumTo100 = (v: { macroFats: number; macroCarbs: number; macroProtein: number }) =>
  v.macroFats + v.macroCarbs + v.macroProtein === 100;

// Create input: user goals require a target weight and a start date, macros must
// sum to 100, and (when present) the end date must be after the start date
// because the range is inclusive (R11/R12/R24/R26). The today/overlap/future-cap
// rules need the user's existing goals + today, so they live in goal validation
// (see goals.ts), not this structural schema.
export const CreateGoalSchema = GoalSchema.omit({
  id: true,
  userId: true,
  isBackground: true,
  calorieDelta: true,
  createdAt: true,
  updatedAt: true,
})
  .extend({
    targetWeightLbs: z.number().positive(),
    startDate: z.string().regex(ISO_DATE),
  })
  .strict()
  .refine(macrosSumTo100, {
    message: 'Macro percentages must total 100',
    path: ['macroProtein'],
  })
  .refine((v) => v.endDate == null || v.endDate > v.startDate, {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

// Update input is partial; which fields are actually allowed depends on the
// goal's lifecycle state (R47–R52) and is enforced in the repository.
export const UpdateGoalSchema = GoalSchema.omit({
  id: true,
  userId: true,
  isBackground: true,
  createdAt: true,
  updatedAt: true,
})
  .partial()
  .strict()
  .refine(
    (v) =>
      v.macroFats == null && v.macroCarbs == null && v.macroProtein == null
        ? true
        : (v.macroFats ?? 0) + (v.macroCarbs ?? 0) + (v.macroProtein ?? 0) === 100,
    { message: 'Macro percentages must total 100', path: ['macroProtein'] },
  );
