import type { Db } from '../db/types';
import { createTestDb } from './db';

// One fresh in-memory database per test; screens reach it through the mocked
// `useDatabase` (see setup.ts), and tests seed it through the repositories.
let current: Db | undefined;

export const testDb = (): Db => (current ??= createTestDb());
export const resetTestDb = (): void => {
  current = undefined;
};
