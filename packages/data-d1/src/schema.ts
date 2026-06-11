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
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

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

export const nutritionDatabaseIngredients = sqliteTable(
  'nutrition_database_ingredients',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    servingAmount: real('serving_amount').notNull(),
    addedByUserId: text('added_by_user_id').notNull(),
    creationSource: text('creation_source', {
      enum: ['manual', 'scan', 'meal_ingredient'],
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
    calories: real('calories').notNull().default(0),
    sugarAlcohol: real('sugar_alcohol'),
    allulose: real('allulose'),
    alcohol: real('alcohol'),
    micronutrientsJson: text('micronutrients_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => [index('nutrition_database_ingredients_name_idx').on(table.name)],
);
