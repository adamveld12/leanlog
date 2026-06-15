import { describe, expect, it } from 'vitest';
import {
  entryReducer,
  initialEntryState,
  type EntryState,
} from '../components/ingredient-entry/entryReducer';
import { emptyDraft, type EntryIngredient } from '../components/ingredient-entry/types';

const ingredient = {
  id: 'i1',
  name: 'Chicken',
  weight: 150,
  calories: 248,
  calorieSource: 'explicit',
  fat: 5,
  saturatedFat: 1,
  carbs: 0,
  fiber: 0,
  protein: 46,
  sugarAlcohol: null,
  allulose: null,
  alcohol: null,
  sourceDatabaseIngredientId: 'db-9',
} as unknown as EntryIngredient;

describe('entryReducer', () => {
  it('setTab changes the active tab only', () => {
    const next = entryReducer(initialEntryState, { type: 'setTab', tab: 'manual' });
    expect(next.tab).toBe('manual');
    expect(next.draft).toBe(initialEntryState.draft);
  });

  it('editRow loads the ingredient into the draft and switches to manual', () => {
    const next = entryReducer(initialEntryState, { type: 'editRow', ingredient });
    expect(next.tab).toBe('manual');
    expect(next.draftSource).toBe('manual');
    expect(next.editingId).toBe('i1');
    expect(next.draft.name).toBe('Chicken');
    expect(next.draft.calories).toBe(248);
    expect(next.draft.sourceDatabaseIngredientId).toBe('db-9');
  });

  it('editRow nulls calories when the source is estimated', () => {
    const next = entryReducer(initialEntryState, {
      type: 'editRow',
      ingredient: { ...ingredient, calorieSource: 'estimated' } as EntryIngredient,
    });
    expect(next.draft.calories).toBeNull();
  });

  it('applyScan merges the patch and marks the draft as scanned', () => {
    const next = entryReducer(initialEntryState, {
      type: 'applyScan',
      patch: { name: 'Oats', protein: 12 },
    });
    expect(next.draft.name).toBe('Oats');
    expect(next.draft.protein).toBe(12);
    expect(next.draftSource).toBe('scanned');
  });

  it('reset clears the draft but keeps the current tab', () => {
    const dirty: EntryState = {
      tab: 'scan',
      draft: { ...emptyDraft, name: 'X' },
      draftSource: 'scanned',
      editingId: 'i1',
    };
    const next = entryReducer(dirty, { type: 'reset' });
    expect(next.tab).toBe('scan');
    expect(next.draft).toEqual(emptyDraft);
    expect(next.draftSource).toBe('manual');
    expect(next.editingId).toBeNull();
  });
});
