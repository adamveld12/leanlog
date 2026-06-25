import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  weightLbs: integer('weight_lbs').notNull().default(180),
  heightInches: integer('height_inches').notNull().default(72),
  calorieMode: text('calorie_mode', {
    enum: ['deficit', 'maintenance', 'surplus', 'custom'],
  })
    .notNull()
    .default('maintenance'),
  targetCalories: integer('target_calories'),
  macroMode: text('macro_mode', { enum: ['percentage', 'custom'] })
    .notNull()
    .default('percentage'),
  macroFats: integer('macro_fats').notNull().default(25),
  macroCarbs: integer('macro_carbs').notNull().default(35),
  macroProtein: integer('macro_protein').notNull().default(40),
  goalWeightLbs: real('goal_weight_lbs'),
  goalBodyFatPct: real('goal_body_fat_pct'),
  // Set once the user's default meal templates have been seeded. Distinguishes
  // "never seeded" (seed Breakfast/Lunch/Dinner/Snack) from "deliberately empty"
  // (user deleted all templates) so we never re-seed. See issue #41.
  mealTemplatesSeededAt: text('meal_templates_seeded_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Goals are the target-planning authority that replaces Profile (#56). Each user
// has one background maintenance goal (null start/end) that supplies fallback
// targets, plus timeline-constrained user goals. Macro fields are percentages
// that sum to 100. `meal_slots_json` stores the slot templates (name + optional
// default ingredients) copied into each new day in the goal window.
export const goals = sqliteTable(
  'goals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => userProfiles.clerkUserId),
    isBackground: integer('is_background', { mode: 'boolean' }).notNull().default(false),
    name: text('name'),
    description: text('description'),
    mode: text('mode', { enum: ['cut', 'maintain', 'lean_gain'] }).notNull(),
    // Null only for the background goal until a weight is known.
    targetWeightLbs: real('target_weight_lbs'),
    macroFats: integer('macro_fats').notNull().default(25),
    macroCarbs: integer('macro_carbs').notNull().default(35),
    macroProtein: integer('macro_protein').notNull().default(40),
    // Null start only for the background goal; user goals always have a start.
    startDate: text('start_date'),
    endDate: text('end_date'),
    calorieDelta: integer('calorie_delta').notNull().default(0),
    // Calorie basis (#63). `bodyweight` keeps the flat multiplier; `katch` derives
    // calories from lean body mass + activity. Defaults to bodyweight so existing
    // goals and the background goal are unchanged until a user opts in.
    calorieBasis: text('calorie_basis', { enum: ['bodyweight', 'katch'] })
      .notNull()
      .default('bodyweight'),
    // Body-composition snapshot, set only on a Katch goal. Body fat is one of the
    // fixed 10/15/20/25 options; activity is one of five tiers. Both null on a
    // bodyweight goal.
    bodyFatPct: real('body_fat_pct'),
    activityLevel: text('activity_level', {
      enum: ['sedentary', 'light', 'moderate', 'very_active', 'athlete'],
    }),
    mealSlotsJson: text('meal_slots_json')
      .notNull()
      .default(
        '[{"name":"Breakfast","ingredients":[]},{"name":"Lunch","ingredients":[]},{"name":"Dinner","ingredients":[]},{"name":"Snack","ingredients":[]}]',
      ),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('goals_user_idx').on(table.userId)],
);

export const dailyMealLogs = sqliteTable(
  'daily_meal_logs',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => userProfiles.clerkUserId),
    date: text('date').notNull(),
    targetCalories: integer('target_calories').notNull().default(2000),
    targetFat: integer('target_fat').notNull().default(70),
    targetCarbs: integer('target_carbs').notNull().default(250),
    targetProtein: integer('target_protein').notNull().default(140),
    mealCountTarget: integer('meal_count_target').notNull().default(3),
    weightLbs: real('weight_lbs'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [uniqueIndex('daily_meal_logs_user_date_idx').on(table.userId, table.date)],
);

export const meals = sqliteTable('meals', {
  id: text('id').primaryKey(),
  dailyMealLogId: text('daily_meal_log_id')
    .notNull()
    .references(() => dailyMealLogs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // Meals copied from a template are fixed in structure and gated by `logged`;
  // ad-hoc meals are freeform. Existing rows default to 'adhoc'/false so
  // pre-feature days behave exactly as before. See issue #41.
  origin: text('origin', { enum: ['template', 'adhoc'] })
    .notNull()
    .default('adhoc'),
  logged: integer('logged', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey(),
  mealId: text('meal_id')
    .notNull()
    .references(() => meals.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  weight: real('weight').notNull().default(0),
  calories: real('calories').notNull().default(0),
  fat: real('fat').notNull().default(0),
  saturatedFat: real('saturated_fat').notNull().default(0),
  carbs: real('carbs').notNull().default(0),
  fiber: real('fiber').notNull().default(0),
  protein: real('protein').notNull().default(0),
  // Extended optional fields
  unsaturatedFat: real('unsaturated_fat'),
  monounsaturatedFat: real('monounsaturated_fat'),
  polyunsaturatedFat: real('polyunsaturated_fat'),
  transFat: real('trans_fat'),
  sugar: real('sugar'),
  sugarAlcohol: real('sugar_alcohol'),
  allulose: real('allulose'),
  alcohol: real('alcohol'),
  calorieSource: text('calorie_source', { enum: ['explicit', 'estimated'] })
    .notNull()
    .default('estimated'),
  estimatedCalories: real('estimated_calories').notNull().default(0),
  micronutrientsJson: text('micronutrients_json'),
  sourceDatabaseIngredientId: text('source_database_ingredient_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// User-level meal templates copied into each new day (issue #41).
export const mealTemplates = sqliteTable(
  'meal_templates',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => userProfiles.clerkUserId),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('meal_templates_user_idx').on(table.userId)],
);

// Default ingredients on a meal template. Mirrors `ingredients` minus mealId,
// keyed to a template instead. Copied (as a snapshot) into a meal's ingredients
// when a day is created.
export const mealTemplateIngredients = sqliteTable('meal_template_ingredients', {
  id: text('id').primaryKey(),
  templateId: text('template_id')
    .notNull()
    .references(() => mealTemplates.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  weight: real('weight').notNull().default(0),
  calories: real('calories').notNull().default(0),
  fat: real('fat').notNull().default(0),
  saturatedFat: real('saturated_fat').notNull().default(0),
  carbs: real('carbs').notNull().default(0),
  fiber: real('fiber').notNull().default(0),
  protein: real('protein').notNull().default(0),
  unsaturatedFat: real('unsaturated_fat'),
  monounsaturatedFat: real('monounsaturated_fat'),
  polyunsaturatedFat: real('polyunsaturated_fat'),
  transFat: real('trans_fat'),
  sugar: real('sugar'),
  sugarAlcohol: real('sugar_alcohol'),
  allulose: real('allulose'),
  alcohol: real('alcohol'),
  calorieSource: text('calorie_source', { enum: ['explicit', 'estimated'] })
    .notNull()
    .default('estimated'),
  estimatedCalories: real('estimated_calories').notNull().default(0),
  micronutrientsJson: text('micronutrients_json'),
  sourceDatabaseIngredientId: text('source_database_ingredient_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// A saved nutrition label (#44). `serving_amount` + `serving_size_unit` are the
// metric serving size; `servings_per_package` is required for package scaling
// and the stricter database scanner. Labels are created only via manual entry or
// scanning on the Nutrition Facts Database tab.
export const nutritionDatabaseIngredients = sqliteTable(
  'nutrition_database_ingredients',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    servingAmount: real('serving_amount').notNull(),
    servingSizeUnit: text('serving_size_unit', { enum: ['gram', 'milliliter'] })
      .notNull()
      .default('gram'),
    servingSizeDisplayText: text('serving_size_display_text'),
    servingsPerPackage: real('servings_per_package').notNull().default(1),
    addedByUserId: text('added_by_user_id').notNull(),
    // `usda` rows are seeded from the curated whole-foods CSV (#72). The column is
    // plain text with no CHECK constraint, so widening this enum is a type-only
    // change — no SQL migration is required.
    creationSource: text('creation_source', {
      enum: ['manual', 'scan', 'usda'],
    }).notNull(),
    fat: real('fat').notNull(),
    carbs: real('carbs').notNull(),
    protein: real('protein').notNull(),
    saturatedFat: real('saturated_fat'),
    unsaturatedFat: real('unsaturated_fat'),
    monounsaturatedFat: real('monounsaturated_fat'),
    polyunsaturatedFat: real('polyunsaturated_fat'),
    transFat: real('trans_fat'),
    fiber: real('fiber'),
    sugar: real('sugar'),
    addedSugars: real('added_sugars'),
    calories: real('calories').notNull().default(0),
    sugarAlcohol: real('sugar_alcohol'),
    allulose: real('allulose'),
    alcohol: real('alcohol'),
    micronutrientsJson: text('micronutrients_json'),
    // R2 object keys for the entry's photos (#54). Both optional. The label
    // photo is auto-kept from a scan; the product photo is user-supplied.
    productPhotoKey: text('product_photo_key'),
    labelPhotoKey: text('label_photo_key'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('nutrition_database_ingredients_name_idx').on(table.name)],
);
