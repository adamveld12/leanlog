import { asc, eq, inArray, max } from 'drizzle-orm';
import {
  NutritionFieldsSchema,
  scaleSavedFood,
  uuidv7,
  type NutritionFields,
} from '@leanlog/data-access';
import { NotFoundError, assertEditableDay } from '../errors';
import { ingredients, meals } from '../schema';
import { withTransaction } from '../tx';
import type { Db } from '../types';
import { enqueueNutritionDelete, enqueueNutritionUpsert } from './hcQueue';
import { getSavedFood } from './savedFoods';
import { ensureDayRow } from './targets';

export type Meal = typeof meals.$inferSelect;
export type Ingredient = typeof ingredients.$inferSelect;
export type MealWithIngredients = Meal & { ingredients: Ingredient[] };

export type NewIngredient = NutritionFields & {
  name: string;
  grams: number;
  savedFoodId: string | null;
};

export async function getMeal(db: Db, id: string): Promise<Meal | null> {
  const [row] = await db.select().from(meals).where(eq(meals.id, id));
  return row ?? null;
}

export async function listMealsForDay(db: Db, date: string): Promise<MealWithIngredients[]> {
  const mealRows = await db
    .select()
    .from(meals)
    .where(eq(meals.date, date))
    .orderBy(asc(meals.position));
  if (mealRows.length === 0) return [];
  const rows = await db
    .select()
    .from(ingredients)
    .where(
      inArray(
        ingredients.mealId,
        mealRows.map((m) => m.id),
      ),
    );
  return mealRows.map((meal) => ({
    ...meal,
    ingredients: rows.filter((r) => r.mealId === meal.id),
  }));
}

async function requireEditableMeal(db: Db, mealId: string, today: string): Promise<Meal> {
  const meal = await getMeal(db, mealId);
  if (!meal) throw new NotFoundError('Meal', mealId);
  assertEditableDay(meal.date, today);
  return meal;
}

async function requireIngredient(db: Db, id: string): Promise<Ingredient> {
  const [row] = await db.select().from(ingredients).where(eq(ingredients.id, id));
  if (!row) throw new NotFoundError('Ingredient', id);
  return row;
}

// Bump the meal's revision and queue its Health Connect upsert, in the caller's
// transaction, so every edit mirrors to one record (same clientRecordId).
async function touchMeal(db: Db, meal: Meal): Promise<void> {
  await db
    .update(meals)
    .set({ revision: meal.revision + 1 })
    .where(eq(meals.id, meal.id));
  await enqueueNutritionUpsert(db, meal.id);
}

export function addMeal(db: Db, today: string, date: string, name: string): Promise<Meal> {
  return withTransaction(db, async () => {
    assertEditableDay(date, today);
    await ensureDayRow(db, today);
    const [{ last }] = await db
      .select({ last: max(meals.position) })
      .from(meals)
      .where(eq(meals.date, date));
    const row = { id: uuidv7(), date, name, position: (last ?? -1) + 1, revision: 0 };
    await db.insert(meals).values(row);
    return row;
  });
}

export function renameMeal(db: Db, today: string, mealId: string, name: string): Promise<void> {
  return withTransaction(db, async () => {
    // Statements in one transaction share a single SQLite connection and must run in order.
    // react-doctor-disable-next-line react-doctor/async-parallel
    const meal = await requireEditableMeal(db, mealId, today);
    await db.update(meals).set({ name }).where(eq(meals.id, mealId));
    await touchMeal(db, meal);
  });
}

export function deleteMeal(db: Db, today: string, mealId: string): Promise<void> {
  return withTransaction(db, async () => {
    // Statements in one transaction share a single SQLite connection and must run in order.
    // react-doctor-disable-next-line react-doctor/async-parallel
    await requireEditableMeal(db, mealId, today);
    await db.delete(meals).where(eq(meals.id, mealId));
    await enqueueNutritionDelete(db, mealId);
  });
}

export function addIngredient(
  db: Db,
  today: string,
  mealId: string,
  data: NewIngredient,
): Promise<Ingredient> {
  return withTransaction(db, async () => {
    const meal = await requireEditableMeal(db, mealId, today);
    const row = { id: uuidv7(), mealId, ...NutritionFieldsSchema.parse(data), ...pickMeta(data) };
    await db.insert(ingredients).values(row);
    await touchMeal(db, meal);
    return row;
  });
}

const pickMeta = (d: NewIngredient) => ({
  name: d.name,
  grams: d.grams,
  savedFoodId: d.savedFoodId,
});

export function updateIngredient(
  db: Db,
  today: string,
  ingredientId: string,
  patch: Partial<NewIngredient>,
): Promise<void> {
  return withTransaction(db, async () => {
    const ingredient = await requireIngredient(db, ingredientId);
    const meal = await requireEditableMeal(db, ingredient.mealId, today);
    const { id: _id, mealId: _mealId, ...fields } = { ...ingredient, ...patch };
    NutritionFieldsSchema.parse(fields);
    await db.update(ingredients).set(fields).where(eq(ingredients.id, ingredientId));
    await touchMeal(db, meal);
  });
}

export function removeIngredient(db: Db, today: string, ingredientId: string): Promise<void> {
  return withTransaction(db, async () => {
    const ingredient = await requireIngredient(db, ingredientId);
    const meal = await requireEditableMeal(db, ingredient.mealId, today);
    await db.delete(ingredients).where(eq(ingredients.id, ingredientId));
    await touchMeal(db, meal);
  });
}

// Log a saved food at `grams`: a scaled value copy with a new id (R7, R8).
export function addIngredientFromSavedFood(
  db: Db,
  today: string,
  mealId: string,
  savedFoodId: string,
  grams: number,
): Promise<Ingredient> {
  return withTransaction(db, async () => {
    const meal = await requireEditableMeal(db, mealId, today);
    // Statements in one transaction share a single SQLite connection and must run in order.
    // react-doctor-disable-next-line react-doctor/server-sequential-independent-await
    const food = await getSavedFood(db, savedFoodId);
    if (!food) throw new NotFoundError('Saved food', savedFoodId);
    const row = {
      id: uuidv7(),
      mealId,
      name: food.name,
      grams,
      ...scaleSavedFood(food, grams),
      savedFoodId,
    };
    await db.insert(ingredients).values(row);
    await touchMeal(db, meal);
    return row;
  });
}
