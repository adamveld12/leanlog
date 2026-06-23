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

  it('stageScan opens the create card and prefills the entry (#54 scan-create)', () => {
    const next = dbReducer(
      { ...initialDbState, error: 'boom' },
      { type: 'stageScan', value: { ...emptyDbEntryValue, name: 'SCANNED' } },
    );
    expect(next.showCreate).toBe(true);
    expect(next.entryValue.name).toBe('SCANNED');
    expect(next.error).toBe('');
  });

  it('stageScanPhoto stages a label key while the create form is open (R3)', () => {
    const open: DbState = { ...initialDbState, showCreate: true };
    const next = dbReducer(open, { type: 'stageScanPhoto', slot: 'label', key: 'nutrition/x.jpg' });
    expect(next.entryValue.labelPhotoKey).toBe('nutrition/x.jpg');
  });

  it('retains a scanned label photo that arrives before the form opens (R3 race)', () => {
    // The R2 upload usually resolves before the slower OCR, so stageScanPhoto can
    // fire before stageScan opens the create form. It must still survive.
    const buffered = dbReducer(initialDbState, {
      type: 'stageScanPhoto',
      slot: 'label',
      key: 'nutrition/x.jpg',
    });
    expect(buffered.showCreate).toBe(false);
    expect(buffered.entryValue.labelPhotoKey ?? null).toBeNull();
    const opened = dbReducer(buffered, {
      type: 'stageScan',
      value: { ...emptyDbEntryValue, name: 'SCANNED' },
    });
    expect(opened.entryValue.labelPhotoKey).toBe('nutrition/x.jpg');
  });

  it('discards a buffered scan photo if the scan is unreadable (R5)', () => {
    const buffered = dbReducer(initialDbState, {
      type: 'stageScanPhoto',
      slot: 'label',
      key: 'nutrition/x.jpg',
    });
    const unreadable = dbReducer(buffered, { type: 'scanUnreadable', error: 'Could not read.' });
    expect(unreadable.showCreate).toBe(false);
    const reopened = dbReducer(unreadable, {
      type: 'stageScan',
      value: { ...emptyDbEntryValue, name: 'RETRY' },
    });
    expect(reopened.entryValue.labelPhotoKey ?? null).toBeNull();
  });

  it('toggleCreate clears a stale buffered scan photo (R5)', () => {
    const buffered = dbReducer(initialDbState, {
      type: 'stageScanPhoto',
      slot: 'label',
      key: 'nutrition/x.jpg',
    });
    const opened = dbReducer(buffered, { type: 'toggleCreate' });
    expect(opened.showCreate).toBe(true);
    expect(opened.pendingScanPhoto).toBeNull();
    expect(opened.entryValue.labelPhotoKey ?? null).toBeNull();
  });
});
