import { describe, it, expect } from 'vitest';
import type { NutritionDatabaseIngredientSearchResult } from '../types';
import {
  nutritionFactsReducer,
  initialNutritionFactsState,
  labelToEntryValue,
  NUTRITION_FACTS_PAGE_SIZE,
} from '../components/nutrition-facts/nutritionFactsReducer';

function makeRecord(
  overrides: Partial<NutritionDatabaseIngredientSearchResult> & { id: string },
): NutritionDatabaseIngredientSearchResult {
  const now = new Date().toISOString();
  return {
    name: 'OATS',
    servingAmount: 40,
    servingSizeUnit: 'gram',
    servingSizeDisplayText: null,
    servingsPerPackage: 12,
    addedByUserId: 'user_test',
    addedByName: 'You',
    creationSource: 'manual',
    fat: 2.5,
    carbs: 27,
    protein: 5,
    saturatedFat: null,
    unsaturatedFat: null,
    monounsaturatedFat: null,
    polyunsaturatedFat: null,
    transFat: null,
    fiber: null,
    sugar: null,
    addedSugars: null,
    calories: 148,
    sugarAlcohol: null,
    allulose: null,
    alcohol: null,
    micronutrients: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const page = (n: number) => Array.from({ length: n }, (_, i) => makeRecord({ id: `r${i}` }));

describe('nutritionFactsReducer', () => {
  it('replaces records on a fresh browse and flags hasMore on a full page', () => {
    const records = page(NUTRITION_FACTS_PAGE_SIZE);
    const next = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'browseSucceeded',
      records,
      total: 120,
      append: false,
    });
    expect(next.records).toHaveLength(NUTRITION_FACTS_PAGE_SIZE);
    expect(next.offset).toBe(NUTRITION_FACTS_PAGE_SIZE);
    expect(next.hasMore).toBe(true);
    expect(next.searched).toBe(true);
    expect(next.total).toBe(120);
  });

  it('appends on load-more and clears hasMore on a short page', () => {
    const first = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'browseSucceeded',
      records: page(NUTRITION_FACTS_PAGE_SIZE),
      total: 70,
      append: false,
    });
    const second = nutritionFactsReducer(first, {
      type: 'browseSucceeded',
      records: [makeRecord({ id: 'extra' })],
      total: 70,
      append: true,
    });
    expect(second.records).toHaveLength(NUTRITION_FACTS_PAGE_SIZE + 1);
    expect(second.hasMore).toBe(false);
  });

  it('search results replace the list and never offer load-more', () => {
    const browsed = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'browseSucceeded',
      records: page(NUTRITION_FACTS_PAGE_SIZE),
      total: 200,
      append: false,
    });
    const searched = nutritionFactsReducer(browsed, {
      type: 'searchSucceeded',
      records: [makeRecord({ id: 'match' })],
      total: 200,
    });
    expect(searched.records).toEqual([makeRecord({ id: 'match' })]);
    expect(searched.hasMore).toBe(false);
  });

  it('openEdit loads the form in edit mode; openCreate resets it', () => {
    const edit = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'openEdit',
      id: 'r1',
      value: labelToEntryValue(makeRecord({ id: 'r1', name: 'RICE' })),
    });
    expect(edit.formOpen).toBe(true);
    expect(edit.editingId).toBe('r1');
    expect(edit.entryValue.name).toBe('RICE');

    const create = nutritionFactsReducer(edit, { type: 'openCreate' });
    expect(create.editingId).toBeNull();
    expect(create.entryValue.name).toBe('');
  });

  it('a scan opens the create form (not edit) and clears any error', () => {
    const staged = nutritionFactsReducer(
      { ...initialNutritionFactsState, error: 'boom', editingId: 'r1' },
      { type: 'stageScan', value: labelToEntryValue(makeRecord({ id: 'r1', name: 'SCANNED' })) },
    );
    expect(staged.formOpen).toBe(true);
    expect(staged.editingId).toBeNull();
    expect(staged.entrySource).toBe('scan');
    expect(staged.error).toBe('');
  });

  it('createSucceeded prepends the record and bumps the total', () => {
    const start = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'browseSucceeded',
      records: [makeRecord({ id: 'old' })],
      total: 1,
      append: false,
    });
    const created = nutritionFactsReducer(start, {
      type: 'createSucceeded',
      record: makeRecord({ id: 'new' }),
    });
    expect(created.records[0]!.id).toBe('new');
    expect(created.total).toBe(2);
    expect(created.formOpen).toBe(false);
  });

  it('updateSucceeded replaces the matching record in place', () => {
    const start = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'browseSucceeded',
      records: [makeRecord({ id: 'a', name: 'OLD' }), makeRecord({ id: 'b' })],
      total: 2,
      append: false,
    });
    const updated = nutritionFactsReducer(start, {
      type: 'updateSucceeded',
      record: makeRecord({ id: 'a', name: 'NEW' }),
    });
    expect(updated.records.find((r) => r.id === 'a')!.name).toBe('NEW');
    expect(updated.records).toHaveLength(2);
    expect(updated.total).toBe(2);
  });

  it('deleteSucceeded removes the record and decrements the total', () => {
    const start = nutritionFactsReducer(initialNutritionFactsState, {
      type: 'browseSucceeded',
      records: [makeRecord({ id: 'a' }), makeRecord({ id: 'b' })],
      total: 2,
      append: false,
    });
    const removed = nutritionFactsReducer(
      { ...start, deletingId: 'a' },
      { type: 'deleteSucceeded', id: 'a' },
    );
    expect(removed.records.map((r) => r.id)).toEqual(['b']);
    expect(removed.total).toBe(1);
    expect(removed.deletingId).toBeNull();
  });
});
