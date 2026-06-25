import { describe, expect, it, vi } from 'vitest';
import { deleteImages, imageKeyFor, isValidImageKey, putImage } from './_images';

// Content-addressed photo keying underpins dedup (R7) and refcounted cleanup
// (R9); these pure helpers are the testable core of the R2 storage layer.

const bytesOf = (s: string): ArrayBuffer => {
  const u8 = new TextEncoder().encode(s);
  // Return a standalone ArrayBuffer (not a view onto a larger pool).
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
};

describe('nutrition image keying', () => {
  it('derives a stable nutrition/<sha256>.jpg key from the bytes', async () => {
    const key = await imageKeyFor(bytesOf('hello'));
    expect(key).toMatch(/^nutrition\/[0-9a-f]{64}\.jpg$/);
    // Deterministic: same bytes -> same key (so identical uploads dedupe).
    expect(await imageKeyFor(bytesOf('hello'))).toBe(key);
  });

  it('produces different keys for different bytes', async () => {
    const a = await imageKeyFor(bytesOf('one'));
    const b = await imageKeyFor(bytesOf('two'));
    expect(a).not.toBe(b);
  });

  it('validates well-formed keys and rejects malformed/path-traversal ones', () => {
    expect(isValidImageKey(`nutrition/${'a'.repeat(64)}.jpg`)).toBe(true);
    expect(isValidImageKey('nutrition/short.jpg')).toBe(false);
    expect(isValidImageKey(`nutrition/${'A'.repeat(64)}.jpg`)).toBe(false); // uppercase
    expect(isValidImageKey(`nutrition/${'a'.repeat(64)}.png`)).toBe(false); // wrong ext
    expect(isValidImageKey('../secret.jpg')).toBe(false);
    expect(isValidImageKey(`other/${'a'.repeat(64)}.jpg`)).toBe(false);
  });
});

describe('putImage dedup', () => {
  it('skips the write when the object already exists', async () => {
    const put = vi.fn();
    const bucket = {
      head: vi.fn().mockResolvedValue({ key: 'exists' }),
      put,
      delete: vi.fn(),
    } as unknown as R2Bucket;
    const key = await putImage(bucket, bytesOf('dup'));
    expect(key).toMatch(/^nutrition\/[0-9a-f]{64}\.jpg$/);
    expect(put).not.toHaveBeenCalled();
  });

  it('writes the object (with JPEG content type) when it is new', async () => {
    const put = vi.fn();
    const bucket = {
      head: vi.fn().mockResolvedValue(null),
      put,
      delete: vi.fn(),
    } as unknown as R2Bucket;
    const key = await putImage(bucket, bytesOf('fresh'));
    expect(put).toHaveBeenCalledWith(key, expect.anything(), {
      httpMetadata: { contentType: 'image/jpeg' },
    });
  });
});

describe('deleteImages cleanup (R9)', () => {
  it('deletes only the valid keys and never throws on bucket errors', async () => {
    const del = vi.fn().mockRejectedValue(new Error('R2 down'));
    const bucket = { head: vi.fn(), put: vi.fn(), delete: del } as unknown as R2Bucket;
    const good = `nutrition/${'a'.repeat(64)}.jpg`;
    await expect(
      deleteImages(bucket, [good, '../evil', 'nutrition/bad.png']),
    ).resolves.toBeUndefined();
    expect(del).toHaveBeenCalledWith([good]);
  });

  it('is a no-op when there are no valid keys', async () => {
    const del = vi.fn();
    const bucket = { head: vi.fn(), put: vi.fn(), delete: del } as unknown as R2Bucket;
    await deleteImages(bucket, ['../evil', 'nope']);
    expect(del).not.toHaveBeenCalled();
  });
});
