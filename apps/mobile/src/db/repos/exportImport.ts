import { asc } from 'drizzle-orm';
import { MobileExportSchema, type MobileExport } from '@leanlog/data-access';
import {
  bodyFatResults,
  days,
  errorLog,
  hcQueue,
  ingredients,
  meals,
  profile,
  savedFoods,
  settings,
} from '../schema';
import { withTransaction } from '../tx';
import type { Db } from '../types';
import { getProfile, getSettings } from './base';

// SQLite caps bound variables per statement (999 on older builds); ingredients
// have the most columns, so 50 rows stays well under it.
const CHUNK = 50;

async function insertChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < rows.length; i += CHUNK) await insert(rows.slice(i, i + CHUNK));
}

// Everything on the device, in a deterministic order, as the versioned export file.
export async function exportAll(
  db: Db,
  exportedAt: string = new Date().toISOString(),
): Promise<MobileExport> {
  return MobileExportSchema.parse({
    format: 'leanlog-mobile',
    version: 1,
    exportedAt,
    profile: await getProfile(db),
    settings: await getSettings(db),
    days: await db.select().from(days).orderBy(asc(days.date)),
    meals: await db.select().from(meals).orderBy(asc(meals.date), asc(meals.position)),
    ingredients: await db
      .select()
      .from(ingredients)
      .orderBy(asc(ingredients.mealId), asc(ingredients.id)),
    savedFoods: await db.select().from(savedFoods).orderBy(asc(savedFoods.id)),
    bodyFatResults: await db
      .select()
      .from(bodyFatResults)
      .orderBy(asc(bodyFatResults.date), asc(bodyFatResults.id)),
    errorLog: await db.select().from(errorLog).orderBy(asc(errorLog.at), asc(errorLog.id)),
  });
}

// Replace all local data with an export file (R33). The file is validated before
// anything is written and the swap is one transaction, so a bad file or a
// mid-import failure leaves the existing data untouched. Pending Health Connect
// work is dropped: history is never replayed to Health Connect.
export async function replaceAll(db: Db, file: unknown): Promise<void> {
  const data = MobileExportSchema.parse(file);
  await withTransaction(db, async () => {
    await db.delete(hcQueue);
    await db.delete(ingredients);
    await db.delete(meals);
    await db.delete(days);
    await db.delete(savedFoods);
    await db.delete(bodyFatResults);
    await db.delete(errorLog);
    await db.update(profile).set(data.profile);
    await db.update(settings).set(data.settings);
    await insertChunks(data.days, (c) => db.insert(days).values(c));
    await insertChunks(data.meals, (c) => db.insert(meals).values(c));
    await insertChunks(data.ingredients, (c) => db.insert(ingredients).values(c));
    await insertChunks(data.savedFoods, (c) => db.insert(savedFoods).values(c));
    await insertChunks(data.bodyFatResults, (c) => db.insert(bodyFatResults).values(c));
    await insertChunks(data.errorLog, (c) => db.insert(errorLog).values(c));
  });
}
