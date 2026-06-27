import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  USDA_SYSTEM_USER_ID,
  USDA_SEED_TIMESTAMP,
  usdaSeedId,
  buildUsdaSeedRow,
  usdaSeedInsertStatement,
  type UsdaCsvRow,
} from './seed';
import { NutritionDatabaseIngredientSchema } from './schemas';
import { validateNutritionLabel } from './validation';

// A representative beef row (carbs/sugar/fiber all 0, some micros blank).
const beefRow: UsdaCsvRow = {
  FOOD_CATEGORY: 'Beef',
  FOOD_DESCRIPTION: 'Beef, grass-fed, ground, raw',
  CALORIES_KCAL: '198',
  PROTEIN_G: '19.42',
  TOTAL_FAT_G: '12.73',
  SATURATED_FAT_G: '5.335',
  TRANS_FAT_G: '0.751',
  CHOLESTEROL_MG: '62',
  SODIUM_MG: '68',
  TOTAL_CARBOHYDRATES_G: '0',
  DIETARY_FIBER_G: '0',
  TOTAL_SUGARS_G: '0',
  ADDED_SUGARS_G: '',
  CALCIUM_MG: '12',
  IRON_MG: '1.99',
  POTASSIUM_MG: '289',
  VITAMIN_A_MCG_RAE: '0',
  VITAMIN_C_MG: '0',
  VITAMIN_D_MCG: '',
  FDC_ID: '168608',
};

// A dairy row where USDA per-100g rounding makes sugar (5.05) exceed carbs (4.8).
const milkRow: UsdaCsvRow = {
  FOOD_CATEGORY: 'Dairy',
  FOOD_DESCRIPTION: 'Milk, whole, 3.25% milkfat, with added vitamin D',
  CALORIES_KCAL: '61',
  PROTEIN_G: '3.15',
  TOTAL_FAT_G: '3.25',
  SATURATED_FAT_G: '1.865',
  TRANS_FAT_G: '0',
  CHOLESTEROL_MG: '10',
  SODIUM_MG: '43',
  TOTAL_CARBOHYDRATES_G: '4.8',
  DIETARY_FIBER_G: '0',
  TOTAL_SUGARS_G: '5.05',
  ADDED_SUGARS_G: '',
  CALCIUM_MG: '113',
  IRON_MG: '0',
  POTASSIUM_MG: '132',
  VITAMIN_A_MCG_RAE: '46',
  VITAMIN_C_MG: '0',
  VITAMIN_D_MCG: '1.3',
  FDC_ID: '171265',
};

describe('usdaSeedId', () => {
  it('produces a valid UUID', () => {
    expect(z.string().uuid().safeParse(usdaSeedId('168608')).success).toBe(true);
  });

  it('is deterministic for the same FDC_ID', () => {
    expect(usdaSeedId('168608')).toBe(usdaSeedId('168608'));
  });

  it('differs for different FDC_IDs', () => {
    expect(usdaSeedId('168608')).not.toBe(usdaSeedId('168652'));
  });

  it('is a version-5 UUID', () => {
    // 13th hex char (start of the 3rd group) encodes the version.
    expect(usdaSeedId('168608')[14]).toBe('5');
  });
});

describe('buildUsdaSeedRow', () => {
  it('maps name, calories, and macros directly', () => {
    const row = buildUsdaSeedRow(beefRow);
    expect(row.name).toBe('Beef, grass-fed, ground, raw');
    expect(row.calories).toBe(198);
    expect(row.protein).toBe(19.42);
    expect(row.fat).toBe(12.73);
    expect(row.carbs).toBe(0);
  });

  it('stores the per-100g serving basis (R4)', () => {
    const row = buildUsdaSeedRow(beefRow);
    expect(row.servingAmount).toBe(100);
    expect(row.servingSizeUnit).toBe('gram');
    expect(row.servingsPerPackage).toBe(1);
  });

  it('marks the row as USDA-owned and read-only provenance (R2)', () => {
    const row = buildUsdaSeedRow(beefRow);
    expect(row.addedByUserId).toBe(USDA_SYSTEM_USER_ID);
    expect(row.creationSource).toBe('usda');
  });

  it('always leaves addedSugars null on whole foods', () => {
    expect(buildUsdaSeedRow(beefRow).addedSugars).toBeNull();
    expect(buildUsdaSeedRow(milkRow).addedSugars).toBeNull();
  });

  it('uses a stable createdAt so search order does not drift on re-seed', () => {
    expect(buildUsdaSeedRow(beefRow).createdAt).toBe(USDA_SEED_TIMESTAMP);
    expect(buildUsdaSeedRow(beefRow).updatedAt).toBe(USDA_SEED_TIMESTAMP);
  });

  it('stores blank optional cells as null', () => {
    // Beef has a blank VITAMIN_D_MCG cell — it must not appear as a micronutrient.
    const row = buildUsdaSeedRow(beefRow);
    expect(row.micronutrients.find((m) => m.name === 'Vitamin D')).toBeUndefined();
  });

  it('maps present micronutrients with their units (R6)', () => {
    const row = buildUsdaSeedRow(beefRow);
    expect(row.micronutrients).toContainEqual({ name: 'Sodium', amount: 68, unit: 'milligram' });
    expect(row.micronutrients).toContainEqual({ name: 'Calcium', amount: 12, unit: 'milligram' });
    // A 0-valued but present cell is still recorded.
    expect(row.micronutrients).toContainEqual({ name: 'Vitamin A', amount: 0, unit: 'microgram' });
  });

  it('maps mcg vitamins to microgram units', () => {
    const row = buildUsdaSeedRow(milkRow);
    expect(row.micronutrients).toContainEqual({
      name: 'Vitamin D',
      amount: 1.3,
      unit: 'microgram',
    });
  });

  it('clamps a sub-value that exceeds its total (R5)', () => {
    const row = buildUsdaSeedRow(milkRow);
    // USDA sugar 5.05 > carbs 4.8 → clamped down to carbs.
    expect(row.sugar).toBe(4.8);
  });

  it('floors a negative carbohydrate-by-difference at 0', () => {
    // USDA carb "by difference" rounds slightly negative on some animal foods; a
    // negative macro is meaningless and fails the read schema, so it clamps to 0.
    const row = buildUsdaSeedRow({ ...beefRow, TOTAL_CARBOHYDRATES_G: '-0.42825' });
    expect(row.carbs).toBe(0);
    expect(NutritionDatabaseIngredientSchema.safeParse(row).success).toBe(true);
  });

  it('produces a row that passes the read schema and label validation', () => {
    const row = buildUsdaSeedRow(milkRow);
    expect(NutritionDatabaseIngredientSchema.safeParse(row).success).toBe(true);
    expect(validateNutritionLabel(row)).toEqual([]);
  });
});

describe('usdaSeedInsertStatement', () => {
  it('emits an idempotent INSERT OR REPLACE for the catalog table', () => {
    const sql = usdaSeedInsertStatement(buildUsdaSeedRow(beefRow));
    expect(sql.startsWith('INSERT OR REPLACE INTO nutrition_database_ingredients')).toBe(true);
    expect(sql.endsWith(');')).toBe(true);
    expect(sql).toContain(usdaSeedId('168608'));
  });

  it('escapes single quotes in the name', () => {
    const sql = usdaSeedInsertStatement(
      buildUsdaSeedRow({ ...beefRow, FOOD_DESCRIPTION: "Devil's food cake" }),
    );
    expect(sql).toContain("'Devil''s food cake'");
  });

  it('serializes micronutrients as JSON and nulls absent values', () => {
    const sql = usdaSeedInsertStatement(buildUsdaSeedRow(beefRow));
    expect(sql).toContain('"name":"Sodium"');
    // added_sugars is always null for whole foods.
    expect(sql).toContain('NULL');
  });
});
