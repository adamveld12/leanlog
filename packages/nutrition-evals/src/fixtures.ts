import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ExpectedLabel } from './scoring';

export type Fixture = {
  name: string;
  imagePath: string;
  mediaType: string;
  expected: ExpectedLabel;
};

const MEDIA_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
};

function findImage(dir: string): { path: string; mediaType: string } | null {
  for (const entry of readdirSync(dir)) {
    const dot = entry.lastIndexOf('.');
    if (dot === -1) continue;
    const ext = entry.slice(dot).toLowerCase();
    if (MEDIA_TYPES[ext]) return { path: join(dir, entry), mediaType: MEDIA_TYPES[ext] };
  }
  return null;
}

// Iterate every subdirectory of `root`. A directory is a runnable fixture when it has
// both an image and an `expected.json`. Directories with `expected.json` but no image
// (templates) are skipped with a warning rather than failing the harness, so the set
// can grow by dropping in files with no code change (R1).
export function loadFixtures(root: string): Fixture[] {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return [];
  }

  const fixtures: Fixture[] = [];
  for (const name of entries.sort()) {
    const dir = join(root, name);
    if (!statSync(dir).isDirectory()) continue;

    const expectedPath = join(dir, 'expected.json');
    let expected: ExpectedLabel;
    try {
      expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedLabel;
    } catch {
      continue; // not a fixture dir
    }

    const image = findImage(dir);
    if (!image) {
      // eslint-disable-next-line no-console
      console.warn(`[evals] skipping "${name}": expected.json present but no image found`);
      continue;
    }

    fixtures.push({ name, imagePath: image.path, mediaType: image.mediaType, expected });
  }
  return fixtures;
}

export function readImageBytes(fixture: Fixture): Uint8Array {
  return new Uint8Array(readFileSync(fixture.imagePath));
}
