import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import migrations from '../db/migrations/migrations';
import * as schema from '../db/schema';
import type { Db } from '../db/types';

// Apply the same bundled migrations the app runs through `useMigrations`.
function applyBundledMigrations(sqlite: Database.Database) {
  for (const entry of migrations.journal.entries) {
    const text = migrations.migrations[`m${String(entry.idx).padStart(4, '0')}`];
    for (const statement of text.split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.exec(statement);
    }
  }
}

export function createTestDb(): Db {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  applyBundledMigrations(sqlite);
  return drizzle(sqlite, { schema }) as unknown as Db;
}
