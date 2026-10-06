import { count } from 'drizzle-orm';
import { MobileExportSchema } from '@leanlog/data-access';
import { mobileSampleExport } from '@leanlog/data-access/fixtures/mobileSample';
import exportV1 from '../../backup/__fixtures__/export-v1.json';
import { createTestDb } from '../../test/db';
import { days, hcQueue, ingredients } from '../schema';
import { ensureSeeded } from './base';
import { exportAll, replaceAll } from './exportImport';
import { enqueueNutritionUpsert } from './hcQueue';
import { addIngredient, addMeal } from './meals';

async function setup() {
  const db = createTestDb();
  await ensureSeeded(db);
  return db;
}

describe('export format contract', () => {
  it('export-v1.json parses with MobileExportSchema and matches the shared fixture', () => {
    expect(MobileExportSchema.parse(exportV1)).toEqual(mobileSampleExport);
  });
});

describe('replaceAll / exportAll', () => {
  it('round-trips every entity', async () => {
    const db = await setup();
    await replaceAll(db, MobileExportSchema.parse(exportV1));
    expect(await exportAll(db, mobileSampleExport.exportedAt)).toEqual(mobileSampleExport);
  });

  it('replaces existing data and clears stale Health Connect work', async () => {
    const db = await setup();
    const m = await addMeal(db, '2026-10-06', '2026-10-06', 'Old');
    await addIngredient(db, '2026-10-06', m.id, {
      name: 'x',
      grams: 1,
      calories: 1,
      fat: 0,
      saturatedFat: 0,
      carbs: 0,
      fiber: 0,
      protein: 0,
      savedFoodId: null,
    });
    await enqueueNutritionUpsert(db, m.id);
    await replaceAll(db, MobileExportSchema.parse(exportV1));
    const names = (await exportAll(db)).meals.map((x) => x.name);
    expect(names).toEqual(['Dinner', 'Breakfast', 'Lunch']);
    const [q] = await db.select({ n: count() }).from(hcQueue);
    expect(q.n).toBe(0);
  });

  it('is all-or-nothing: a failure mid-import keeps the previous data', async () => {
    const db = await setup();
    await replaceAll(db, MobileExportSchema.parse(exportV1));
    const broken = MobileExportSchema.parse(exportV1);
    // An ingredient pointing at a missing meal violates the foreign key midway.
    broken.ingredients.push({ ...broken.ingredients[0], id: 'orphan', mealId: 'missing' });
    await expect(replaceAll(db, broken)).rejects.toThrow();
    const [d] = await db.select({ n: count() }).from(days);
    const [i] = await db.select({ n: count() }).from(ingredients);
    expect(d.n).toBe(mobileSampleExport.days.length);
    expect(i.n).toBe(mobileSampleExport.ingredients.length);
  });

  it('rejects an invalid file without touching data', async () => {
    const db = await setup();
    await replaceAll(db, MobileExportSchema.parse(exportV1));
    await expect(replaceAll(db, { ...exportV1, version: 2 } as never)).rejects.toThrow();
    const [d] = await db.select({ n: count() }).from(days);
    expect(d.n).toBe(mobileSampleExport.days.length);
  });
});
