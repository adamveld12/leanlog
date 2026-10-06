import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { getDb } from './client';
import migrations from './migrations/migrations';
import type { Db } from './types';

// Opens the device database and applies bundled migrations. `db` is null until
// migrations have run, so nothing touches an out-of-date schema.
export function useDatabase(): { db: Db | null; error: Error | undefined } {
  const db = getDb();
  const { success, error } = useMigrations(db, migrations);
  return { db: success ? db : null, error };
}
