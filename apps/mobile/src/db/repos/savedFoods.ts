import { asc, eq } from 'drizzle-orm';
import { SavedFoodSchema, uuidv7, type SavedFood } from '@leanlog/data-access';
import { NotFoundError } from '../errors';
import { savedFoods } from '../schema';
import type { Db } from '../types';

export type NewSavedFood = Omit<SavedFood, 'id' | 'createdAt' | 'updatedAt'>;

export async function listSavedFoods(db: Db): Promise<SavedFood[]> {
  return db.select().from(savedFoods).orderBy(asc(savedFoods.name));
}

export async function getSavedFood(db: Db, id: string): Promise<SavedFood | null> {
  const [row] = await db.select().from(savedFoods).where(eq(savedFoods.id, id));
  return row ?? null;
}

export async function createSavedFood(db: Db, input: NewSavedFood): Promise<SavedFood> {
  const now = new Date().toISOString();
  const food = SavedFoodSchema.parse({ ...input, id: uuidv7(), createdAt: now, updatedAt: now });
  await db.insert(savedFoods).values(food);
  return food;
}

// Editing a saved food only changes the list entry; ingredients already logged
// hold their own copy of the values (R8).
export async function updateSavedFood(
  db: Db,
  id: string,
  patch: Partial<NewSavedFood>,
): Promise<SavedFood> {
  const current = await getSavedFood(db, id);
  if (!current) throw new NotFoundError('Saved food', id);
  const next = SavedFoodSchema.parse({
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  await db.update(savedFoods).set(next).where(eq(savedFoods.id, id));
  return next;
}

export async function deleteSavedFood(db: Db, id: string): Promise<void> {
  await db.delete(savedFoods).where(eq(savedFoods.id, id));
}
