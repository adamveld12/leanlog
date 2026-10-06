import { sql } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

// On-device schema (#75). Weights are lb, lengths are inches (see data-access units).

// Singleton rows: `id` is always 1.
export const profile = sqliteTable('profile', {
  id: integer('id').primaryKey().default(1),
  sex: text('sex', { enum: ['male', 'female'] }),
  heightIn: real('height_in'),
  birthDate: text('birth_date'),
  onboardingWeightLbs: real('onboarding_weight_lbs'),
  activityLevel: text('activity_level', {
    enum: ['sedentary', 'light', 'moderate', 'very_active', 'athlete'],
  }),
  calorieDelta: integer('calorie_delta').notNull().default(0),
  macroFats: real('macro_fats').notNull().default(30),
  macroCarbs: real('macro_carbs').notNull().default(40),
  macroProtein: real('macro_protein').notNull().default(30),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  units: text('units', { enum: ['imperial', 'metric'] })
    .notNull()
    .default('imperial'),
  analyticsOptIn: integer('analytics_opt_in', { mode: 'boolean' }).notNull().default(false),
  hcEnabled: integer('hc_enabled', { mode: 'boolean' }).notNull().default(false),
});

// One row per local calendar day. Targets are frozen once the day is past.
export const days = sqliteTable('days', {
  date: text('date').primaryKey(),
  targetCalories: real('target_calories').notNull(),
  targetFat: real('target_fat').notNull(),
  targetCarbs: real('target_carbs').notNull(),
  targetProtein: real('target_protein').notNull(),
  basis: text('basis', { enum: ['katch', 'bodyweight'] }).notNull(),
  weightLbs: real('weight_lbs'),
  weightSource: text('weight_source', { enum: ['manual', 'hc'] }),
  weightAt: text('weight_at'),
  shoulderIn: real('shoulder_in'),
  waistIn: real('waist_in'),
  bicepIn: real('bicep_in'),
  thighIn: real('thigh_in'),
  neckIn: real('neck_in'),
  hipIn: real('hip_in'),
});

export const meals = sqliteTable(
  'meals',
  {
    id: text('id').primaryKey(),
    date: text('date')
      .notNull()
      .references(() => days.date, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    position: integer('position').notNull(),
    // Bumped on every edit; the Health Connect clientRecordVersion.
    revision: integer('revision').notNull().default(0),
  },
  (t) => [index('meals_date_idx').on(t.date)],
);

export const ingredients = sqliteTable(
  'ingredients',
  {
    id: text('id').primaryKey(),
    mealId: text('meal_id')
      .notNull()
      .references(() => meals.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    grams: real('grams').notNull(),
    calories: real('calories').notNull(),
    fat: real('fat').notNull(),
    saturatedFat: real('saturated_fat').notNull(),
    carbs: real('carbs').notNull(),
    fiber: real('fiber').notNull(),
    protein: real('protein').notNull(),
    // Provenance only, deliberately not a foreign key (R8: copies, not links).
    savedFoodId: text('saved_food_id'),
  },
  (t) => [index('ingredients_meal_idx').on(t.mealId)],
);

export const savedFoods = sqliteTable('saved_foods', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  referenceGrams: real('reference_grams').notNull(),
  calories: real('calories').notNull(),
  fat: real('fat').notNull(),
  saturatedFat: real('saturated_fat').notNull(),
  carbs: real('carbs').notNull(),
  fiber: real('fiber').notNull(),
  protein: real('protein').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const bodyFatResults = sqliteTable(
  'body_fat_results',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    pct: integer('pct').notNull(),
    method: text('method', { enum: ['navy', 'jp3'] }).notNull(),
    inputs: text('inputs', { mode: 'json' }).$type<Record<string, number>>().notNull(),
  },
  (t) => [index('body_fat_date_idx').on(t.date)],
);

// Pending Health Connect writes. At most one row per (recordType, clientRecordId):
// a later edit replaces the pending op, so retries never pile up.
export const hcQueue = sqliteTable(
  'hc_queue',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    op: text('op', { enum: ['upsert', 'delete'] }).notNull(),
    recordType: text('record_type', {
      enum: ['Nutrition', 'Weight', 'BodyFat', 'Height'],
    }).notNull(),
    clientRecordId: text('client_record_id').notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>(),
    attempts: integer('attempts').notNull().default(0),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  },
  (t) => [uniqueIndex('hc_queue_record_idx').on(t.recordType, t.clientRecordId)],
);

export const errorLog = sqliteTable('error_log', {
  id: text('id').primaryKey(),
  at: text('at').notNull(),
  source: text('source').notNull(),
  message: text('message').notNull(),
});
