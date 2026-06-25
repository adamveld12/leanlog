// Shared helpers for nutrition-entry photo objects in R2 (#54).
//
// Photos are content-addressed: the object key is derived from a SHA-256 of the
// (already client-optimized) image bytes, so identical uploads dedupe to one
// object. Keys live under the `nutrition/` prefix and are served publicly with
// an immutable cache, so the digest doubling as the filename is safe.

const PREFIX = 'nutrition/';

// JPEG only: the client optimizer always re-encodes to JPEG (~1600px, q~0.8).
const CONTENT_TYPE = 'image/jpeg';
const EXTENSION = 'jpg';

// Cap accepted uploads well above the client target to allow some slack but
// still reject anything that isn't a sanely-sized photo (defense in depth).
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function imageContentType(): string {
  return CONTENT_TYPE;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Content-addressed object key for the given image bytes, e.g. `nutrition/<sha256>.jpg`. */
export async function imageKeyFor(bytes: ArrayBuffer): Promise<string> {
  return `${PREFIX}${await sha256Hex(bytes)}.${EXTENSION}`;
}

/** True when a stored key is a well-formed nutrition image key (guards the public route). */
export function isValidImageKey(key: string): boolean {
  return /^nutrition\/[0-9a-f]{64}\.jpg$/.test(key);
}

/** Stores bytes under their content-addressed key, skipping the write if it already exists. */
export async function putImage(bucket: R2Bucket, bytes: ArrayBuffer): Promise<string> {
  const key = await imageKeyFor(bytes);
  const existing = await bucket.head(key);
  if (!existing) {
    await bucket.put(key, bytes, { httpMetadata: { contentType: CONTENT_TYPE } });
  }
  return key;
}

/** Best-effort deletion of orphaned objects; never throws (cleanup is non-critical). */
export async function deleteImages(bucket: R2Bucket, keys: string[]): Promise<void> {
  const valid = keys.filter(isValidImageKey);
  if (valid.length === 0) return;
  try {
    await bucket.delete(valid);
  } catch {
    // Orphan cleanup is opportunistic; a failed delete just leaves an unreferenced
    // object that a later sweep can collect. Swallow so the request still succeeds.
  }
}
