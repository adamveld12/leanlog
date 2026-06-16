import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFixtures } from './fixtures';

function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), 'evals-fixtures-'));
}

function writeFixture(root: string, name: string, files: Record<string, string>) {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  for (const [file, content] of Object.entries(files)) writeFileSync(join(dir, file), content);
}

afterEach(() => vi.restoreAllMocks());

describe('loadFixtures', () => {
  it('loads dirs that have both an image and expected.json', () => {
    const root = makeRoot();
    writeFixture(root, '001-per-serving', {
      'label.jpg': 'fake-bytes',
      'expected.json': JSON.stringify({ basis: 'per_serving' }),
    });
    const fixtures = loadFixtures(root);
    expect(fixtures).toHaveLength(1);
    expect(fixtures[0].name).toBe('001-per-serving');
    expect(fixtures[0].mediaType).toBe('image/jpeg');
    expect(fixtures[0].expected.basis).toBe('per_serving');
  });

  it('skips template dirs with expected.json but no image (with a warning)', () => {
    const root = makeRoot();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    writeFixture(root, 'EXAMPLE', { 'expected.json': JSON.stringify({ basis: 'unknown' }) });
    expect(loadFixtures(root)).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it('returns an empty array when the fixtures root is missing', () => {
    expect(loadFixtures(join(makeRoot(), 'does-not-exist'))).toEqual([]);
  });
});
