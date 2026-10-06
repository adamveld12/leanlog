import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';
import type { Db } from './types';

let instance: Db | null = null;

// One connection for the app's lifetime. Foreign keys are off by default in
// SQLite and the pragma is a no-op inside a transaction, so set it at open.
export function getDb(): Db {
  if (!instance) {
    const sqlite = openDatabaseSync('leanlog.db');
    sqlite.execSync('PRAGMA foreign_keys = ON');
    instance = drizzle(sqlite, { schema });
  }
  return instance;
}
