import { describe, expect, it } from 'vitest';
import {
  dbReducer,
  emptyDbEntryValue,
  initialDbState,
  type DbState,
} from '../components/ingredient-entry/dbReducer';
import type { NutritionDatabaseSearchResult } from '@leanlog/ui';

const result = { id: 'r1', name: 'Rice' } as unknown as NutritionDatabaseSearchResult;

describe('dbReducer', () => {
  it('clearResults empties results and unmarks searched', () => {
    const dirty: DbState = { ...initialDbState, results: [result], searched: true };
    const next = dbReducer(dirty, { type: 'clearResults' });
    expect(next.results).toEqual([]);
    expect(next.searched).toBe(false);
  });

  it('searchSucceeded stores results, stops loading, marks searched', () => {
    const next = dbReducer(
      { ...initialDbState, loading: true },
      {
        type: 'searchSucceeded',
        results: [result],
      },
    );
    expect(next).toMatchObject({ loading: false, searched: true, results: [result] });
  });

  it('addSucceeded drops the added id from amounts and clears addingId', () => {
    const dirty: DbState = { ...initialDbState, addingId: 'a', amounts: { a: 100, b: 50 } };
    const next = dbReducer(dirty, { type: 'addSucceeded', id: 'a' });
    expect(next.addingId).toBeNull();
    expect(next.amounts).toEqual({ b: 50 });
  });

  it('createSucceeded resets the entry form and closes the create card', () => {
    const dirty: DbState = {
      ...initialDbState,
      creating: true,
      showCreate: true,
      entryValue: { ...emptyDbEntryValue, name: 'X' },
    };
    const next = dbReducer(dirty, { type: 'createSucceeded' });
    expect(next).toMatchObject({
      creating: false,
      showCreate: false,
      entryValue: emptyDbEntryValue,
    });
  });

  it('toggleCreate flips the create card visibility', () => {
    expect(dbReducer(initialDbState, { type: 'toggleCreate' }).showCreate).toBe(true);
  });
});
