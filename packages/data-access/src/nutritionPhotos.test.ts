import { describe, it, expect } from 'vitest';
import { resolvePhotoUpdate } from './nutritionPhotos';

describe('resolvePhotoUpdate (#54)', () => {
  const existing = {
    productPhotoKey: 'nutrition/old-prod.jpg',
    labelPhotoKey: 'nutrition/lbl.jpg',
  };

  it('leaves a slot unchanged when the patch omits it', () => {
    const { next, releasedKeys } = resolvePhotoUpdate(existing, {
      productPhotoKey: 'nutrition/new-prod.jpg',
    });
    expect(next).toEqual({
      productPhotoKey: 'nutrition/new-prod.jpg',
      labelPhotoKey: 'nutrition/lbl.jpg',
    });
    // The replaced product key is released; the untouched label key is not.
    expect(releasedKeys).toEqual(['nutrition/old-prod.jpg']);
  });

  it('clears a slot when the patch sets it to null and releases the old key', () => {
    const { next, releasedKeys } = resolvePhotoUpdate(existing, { labelPhotoKey: null });
    expect(next).toEqual({
      productPhotoKey: 'nutrition/old-prod.jpg',
      labelPhotoKey: null,
    });
    expect(releasedKeys).toEqual(['nutrition/lbl.jpg']);
  });

  it('releases both keys when both are cleared (deletion case)', () => {
    const { next, releasedKeys } = resolvePhotoUpdate(existing, {
      productPhotoKey: null,
      labelPhotoKey: null,
    });
    expect(next).toEqual({ productPhotoKey: null, labelPhotoKey: null });
    expect(releasedKeys.sort()).toEqual(['nutrition/lbl.jpg', 'nutrition/old-prod.jpg']);
  });

  it('does not release a key that is re-set to the same value', () => {
    const { releasedKeys } = resolvePhotoUpdate(existing, {
      productPhotoKey: 'nutrition/old-prod.jpg',
    });
    expect(releasedKeys).toEqual([]);
  });

  it('releases nothing when setting a slot that was previously empty', () => {
    const { next, releasedKeys } = resolvePhotoUpdate(
      { productPhotoKey: null, labelPhotoKey: null },
      { productPhotoKey: 'nutrition/new.jpg' },
    );
    expect(next).toEqual({ productPhotoKey: 'nutrition/new.jpg', labelPhotoKey: null });
    expect(releasedKeys).toEqual([]);
  });
});
