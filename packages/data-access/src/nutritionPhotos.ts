// Pure photo-slot reconciliation for nutrition database entries (#54).
//
// An entry has two optional photo slots (product + label), each holding an R2
// object key. When a creator patches photos we must decide (a) the next column
// values and (b) which old keys are no longer referenced by *this* entry and so
// may be garbage-collected from R2 (subject to a separate cross-entry refcount,
// since identical bytes dedupe to the same content-addressed key).
//
// Semantics of a patch field:
//   - omitted (undefined): leave that slot unchanged.
//   - string: set the slot to that key.
//   - null: clear the slot.
// A key is "released" only when it actually changes to a different value.

export type EntryPhotoKeys = {
  productPhotoKey: string | null;
  labelPhotoKey: string | null;
};

export type PhotoUpdatePatch = {
  productPhotoKey?: string | null;
  labelPhotoKey?: string | null;
};

export type PhotoUpdateResult = {
  next: EntryPhotoKeys;
  /** Old keys this entry no longer references (candidates for R2 cleanup). */
  releasedKeys: string[];
};

function resolveSlot(
  current: string | null,
  patched: string | null | undefined,
  released: string[],
): string | null {
  // Omitted: keep the current value, release nothing.
  if (patched === undefined) return current;
  // Changed to a different value (including null): the old key is released.
  if (current && current !== patched) released.push(current);
  return patched;
}

export function resolvePhotoUpdate(
  current: EntryPhotoKeys,
  patch: PhotoUpdatePatch,
): PhotoUpdateResult {
  const releasedKeys: string[] = [];
  const next: EntryPhotoKeys = {
    productPhotoKey: resolveSlot(current.productPhotoKey, patch.productPhotoKey, releasedKeys),
    labelPhotoKey: resolveSlot(current.labelPhotoKey, patch.labelPhotoKey, releasedKeys),
  };
  return { next, releasedKeys };
}

/** Keys an entry holds, for deletion cleanup. Empty slots and dupes are dropped. */
export function entryPhotoKeys(entry: EntryPhotoKeys): string[] {
  return [...new Set([entry.productPhotoKey, entry.labelPhotoKey].filter((k): k is string => !!k))];
}
