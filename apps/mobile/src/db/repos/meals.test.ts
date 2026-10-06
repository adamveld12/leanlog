import { sql } from 'drizzle-orm';
import { createTestDb } from '../../test/db';
import { PastDayLockedError } from '../errors';
import { hcQueue } from '../schema';
import { ensureSeeded } from './base';
import {
  addIngredient,
  addIngredientFromSavedFood,
  addMeal,
  deleteMeal,
  getMeal,
  listMealsForDay,
  removeIngredient,
  renameMeal,
  updateIngredient,
} from './meals';
import { createSavedFood, updateSavedFood } from './savedFoods';

const TODAY = '2026-10-06';
const YESTERDAY = '2026-10-05';

const oats = {
  name: 'Oats',
  referenceGrams: 100,
  calories: 380,
  fat: 7,
  saturatedFat: 1.2,
  carbs: 67,
  fiber: 10,
  protein: 13,
};

const egg = {
  name: 'Egg',
  grams: 50,
  calories: 72,
  fat: 5,
  saturatedFat: 1.6,
  carbs: 0.4,
  fiber: 0,
  protein: 6,
  savedFoodId: null,
};

async function setup() {
  const db = createTestDb();
  await ensureSeeded(db);
  return db;
}

describe('meals', () => {
  it('adds meals in order and totals ingredients', async () => {
    const db = await setup();
    const b = await addMeal(db, TODAY, TODAY, 'Breakfast');
    await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, b.id, egg);
    await addIngredient(db, TODAY, b.id, egg);
    const list = await listMealsForDay(db, TODAY);
    expect(list.map((m) => [m.name, m.position])).toEqual([
      ['Breakfast', 0],
      ['Lunch', 1],
    ]);
    expect(list[0].ingredients).toHaveLength(2);
  });

  it('every edit bumps the revision and queues one Nutrition upsert per meal', async () => {
    const db = await setup();
    const m = await addMeal(db, TODAY, TODAY, 'Lunch');
    const ing = await addIngredient(db, TODAY, m.id, egg);
    await updateIngredient(db, TODAY, ing.id, { grams: 100 });
    await renameMeal(db, TODAY, m.id, 'Big lunch');
    expect((await getMeal(db, m.id))?.revision).toBe(3);
    const queue = await db.select().from(hcQueue);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      op: 'upsert',
      recordType: 'Nutrition',
      clientRecordId: `meal:${m.id}`,
    });
  });

  it('deleting a meal removes its ingredients and queues a delete', async () => {
    const db = await setup();
    const m = await addMeal(db, TODAY, TODAY, 'Lunch');
    const ing = await addIngredient(db, TODAY, m.id, egg);
    await deleteMeal(db, TODAY, m.id);
    expect(await getMeal(db, m.id)).toBeNull();
    const queue = await db.select().from(hcQueue);
    expect(queue).toEqual([
      expect.objectContaining({ op: 'delete', clientRecordId: `meal:${m.id}` }),
    ]);
    await expect(removeIngredient(db, TODAY, ing.id)).rejects.toThrow(/not found/);
  });

  it('writes the ingredient, revision bump and queue entry atomically', async () => {
    const db = await setup();
    const m = await addMeal(db, TODAY, TODAY, 'Lunch');
    // Break the queue so the last step of the transaction fails.
    await db.run(sql`DROP TABLE hc_queue`);
    await expect(addIngredient(db, TODAY, m.id, egg)).rejects.toThrow();
    const after = await getMeal(db, m.id);
    expect(after?.revision).toBe(0);
    expect((await listMealsForDay(db, TODAY))[0].ingredients).toEqual([]);
  });
});

describe('past days are read-only (R4)', () => {
  it('rejects every meal and ingredient mutation', async () => {
    const db = await setup();
    const m = await addMeal(db, YESTERDAY, YESTERDAY, 'Dinner');
    const ing = await addIngredient(db, YESTERDAY, m.id, egg);
    const food = await createSavedFood(db, oats);

    await expect(addMeal(db, TODAY, YESTERDAY, 'Late')).rejects.toBeInstanceOf(PastDayLockedError);
    await expect(renameMeal(db, TODAY, m.id, 'x')).rejects.toBeInstanceOf(PastDayLockedError);
    await expect(deleteMeal(db, TODAY, m.id)).rejects.toBeInstanceOf(PastDayLockedError);
    await expect(addIngredient(db, TODAY, m.id, egg)).rejects.toBeInstanceOf(PastDayLockedError);
    await expect(updateIngredient(db, TODAY, ing.id, { grams: 1 })).rejects.toBeInstanceOf(
      PastDayLockedError,
    );
    await expect(removeIngredient(db, TODAY, ing.id)).rejects.toBeInstanceOf(PastDayLockedError);
    await expect(addIngredientFromSavedFood(db, TODAY, m.id, food.id, 50)).rejects.toBeInstanceOf(
      PastDayLockedError,
    );
    const [stored] = await listMealsForDay(db, YESTERDAY);
    expect(stored.name).toBe('Dinner');
    expect(stored.ingredients).toHaveLength(1);
  });
});

describe('saved foods', () => {
  it('scales by grams from the reference amount (50 g Oats → 190 kcal)', async () => {
    const db = await setup();
    const m = await addMeal(db, TODAY, TODAY, 'Breakfast');
    const food = await createSavedFood(db, oats);
    const ing = await addIngredientFromSavedFood(db, TODAY, m.id, food.id, 50);
    expect(ing).toMatchObject({ name: 'Oats', grams: 50, calories: 190, savedFoodId: food.id });
  });

  it('editing a saved food never rewrites logged ingredients (R8)', async () => {
    const db = await setup();
    const m = await addMeal(db, TODAY, TODAY, 'Breakfast');
    const food = await createSavedFood(db, oats);
    await addIngredientFromSavedFood(db, TODAY, m.id, food.id, 50);
    await updateSavedFood(db, food.id, { calories: 400 });
    const [meal] = await listMealsForDay(db, TODAY);
    expect(meal.ingredients[0].calories).toBe(190);
  });
});
