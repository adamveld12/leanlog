import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import {
  NutritionLabelOwnershipError,
  buildUsdaSeedRow,
  usdaSeedInsertStatement,
  USDA_SYSTEM_USER_ID,
  type UsdaCsvRow,
} from '@leanlog/data-access';
import { createNutritionDatabaseRepository } from './nutritionDatabase';
import { nutritionDatabaseIngredients } from '../schema';

// A curated-style CSV row used to exercise the read-only USDA provenance through
// the real repository (#72). Seeded rows are owned by the sentinel id, so the
// existing owner-only gate makes them read-only to every real user for free.
const riceRow: UsdaCsvRow = {
  FOOD_CATEGORY: 'Rice',
  FOOD_DESCRIPTION: 'Rice, white, long-grain, regular, raw, enriched',
  CALORIES_KCAL: '365',
  PROTEIN_G: '7.13',
  TOTAL_FAT_G: '0.66',
  SATURATED_FAT_G: '0.18',
  TRANS_FAT_G: '',
  CHOLESTEROL_MG: '0',
  SODIUM_MG: '5',
  TOTAL_CARBOHYDRATES_G: '80',
  DIETARY_FIBER_G: '1.3',
  TOTAL_SUGARS_G: '0.12',
  ADDED_SUGARS_G: '',
  CALCIUM_MG: '28',
  IRON_MG: '4.31',
  POTASSIUM_MG: '115',
  VITAMIN_A_MCG_RAE: '0',
  VITAMIN_C_MG: '0',
  VITAMIN_D_MCG: '',
  FDC_ID: '169756',
};

// Insert a USDA-seeded row exactly as the seed pipeline would: via the generated
// INSERT OR REPLACE statement, so the test also exercises that SQL against D1.
async function seedUsdaRow(db: D1Database, row: UsdaCsvRow): Promise<string> {
  const seed = buildUsdaSeedRow(row);
  await db.prepare(usdaSeedInsertStatement(seed)).run();
  return seed.id;
}

describe('nutrition database USDA seed (#72)', () => {
  beforeEach(async () => {
    // Each test starts from an empty catalog.
    await drizzle(env.DB).delete(nutritionDatabaseIngredients);
  });

  test('the seed SQL is idempotent — re-applying it does not duplicate', async () => {
    const repo = createNutritionDatabaseRepository(env.DB);
    const id = await seedUsdaRow(env.DB, riceRow);
    await seedUsdaRow(env.DB, riceRow);
    expect(await repo.count()).toBe(1);
    const row = await repo.getById(id);
    expect(row?.creationSource).toBe('usda');
    expect(row?.addedByUserId).toBe(USDA_SYSTEM_USER_ID);
  });

  test('a seeded food is searchable in the shared catalog', async () => {
    const repo = createNutritionDatabaseRepository(env.DB);
    await seedUsdaRow(env.DB, riceRow);
    const results = await repo.search('rice');
    expect(results).toHaveLength(1);
    expect(results[0]!.creationSource).toBe('usda');
  });

  test('any user is blocked from editing a seeded food (owner-only gate)', async () => {
    const repo = createNutritionDatabaseRepository(env.DB);
    const id = await seedUsdaRow(env.DB, riceRow);

    await expect(
      repo.update('user_real', id, {
        name: 'Hacked rice',
        servingAmount: 100,
        servingSizeUnit: 'gram',
        servingsPerPackage: 1,
        fat: 0.66,
        carbs: 80,
        protein: 7.13,
        calories: 365,
      }),
    ).rejects.toBeInstanceOf(NutritionLabelOwnershipError);

    // The food's values are unchanged.
    const row = await repo.getById(id);
    expect(row?.name).toBe('Rice, white, long-grain, regular, raw, enriched');
  });

  test('any user is blocked from deleting a seeded food, which remains in the catalog', async () => {
    const repo = createNutritionDatabaseRepository(env.DB);
    const id = await seedUsdaRow(env.DB, riceRow);

    await expect(repo.delete('user_real', id)).rejects.toBeInstanceOf(NutritionLabelOwnershipError);
    expect(await repo.getById(id)).not.toBeNull();
    expect(await repo.count()).toBe(1);
  });

  test('calories and macros are populated for a seeded food', async () => {
    const repo = createNutritionDatabaseRepository(env.DB);
    const id = await seedUsdaRow(env.DB, riceRow);
    const row = await repo.getById(id);
    for (const field of ['calories', 'protein', 'fat', 'carbs'] as const) {
      expect(typeof row?.[field]).toBe('number');
    }
    // Added sugars are absent on whole foods.
    expect(row?.addedSugars).toBeNull();
  });
});
