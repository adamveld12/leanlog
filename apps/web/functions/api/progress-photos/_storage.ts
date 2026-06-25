// Private progress-photo objects in R2 (#69).
//
// Deliberately diverges from the public, content-addressed nutrition path
// (`../nutrition-database/_images.ts`): objects are keyed
// `progress/<userId>/<uuid>.jpg` with a random filename — no content-addressing,
// no cross-user dedupe (R7) — and are served only through an authenticated proxy
// that checks the `<userId>` prefix (R8/R9). The same `IMAGES` bucket is reused.

import { isValidProgressPhotoKey } from '@leanlog/data-access';

// JPEG only: the client optimizer always re-encodes to JPEG (~1600px, q~0.8).
const CONTENT_TYPE = 'image/jpeg';

// Cap accepted uploads above the client target for slack, while still rejecting
// anything that isn't a sanely-sized photo (defense in depth).
export const MAX_PROGRESS_IMAGE_BYTES = 5 * 1024 * 1024;

export function progressContentType(): string {
  return CONTENT_TYPE;
}

/** A fresh private key for `userId`, e.g. `progress/<userId>/<uuid>.jpg`. */
export function progressKeyFor(userId: string): string {
  return `progress/${userId}/${crypto.randomUUID()}.jpg`;
}

/**
 * Stores bytes under a fresh per-user key and returns it. Unlike nutrition
 * photos there is no head()/dedupe: every upload is a distinct object so two
 * users' byte-identical photos never collide (R7).
 */
export async function putProgressImage(
  bucket: R2Bucket,
  userId: string,
  bytes: ArrayBuffer,
): Promise<string> {
  const key = progressKeyFor(userId);
  await bucket.put(key, bytes, { httpMetadata: { contentType: CONTENT_TYPE } });
  return key;
}

/**
 * Best-effort deletion of a released object (R18); never throws. The key is
 * re-validated to a strict pattern so a malformed value can't delete anything
 * unexpected. No cross-day refcount is needed — keys are per-user and unique.
 */
export async function deleteProgressImage(bucket: R2Bucket, key: string): Promise<void> {
  if (!isValidProgressPhotoKey(key)) return;
  try {
    await bucket.delete(key);
  } catch {
    // Cleanup is opportunistic; a failed delete just leaves an unreferenced
    // object for a later sweep. Swallow so the request still succeeds.
  }
}
