import { sql } from 'drizzle-orm';
import { DomainError } from './errors';
import { logError } from './repos/errorLog';
import type { Db } from './types';

// Atomic multi-row writes (the on-device equivalent of D1's `batch`).
//
// drizzle's `db.transaction(async …)` can't run on the better-sqlite3 driver the
// repo tests use, so we issue BEGIN/COMMIT ourselves. A per-database queue keeps
// two transactions from interleaving on the one connection. Public repo
// functions open a transaction; the helpers they call take the same `Db` and
// must not call `withTransaction` again (it would wait on itself).
const queues = new WeakMap<object, Promise<unknown>>();

// Validation failures and domain rules are expected; anything else is a real
// database problem worth keeping in the local log. Logging must never mask the
// original error.
async function recordUnexpected(db: Db, error: unknown): Promise<void> {
  const name = error instanceof Error ? error.name : '';
  if (error instanceof DomainError || error instanceof RangeError || name === 'ZodError') return;
  try {
    await logError(db, 'database', error);
  } catch {
    // The log itself failed; nothing more to do.
  }
}

export function withTransaction<T>(db: Db, fn: () => Promise<T>): Promise<T> {
  const previous = queues.get(db) ?? Promise.resolve();
  const run = previous.then(async () => {
    await db.run(sql`BEGIN IMMEDIATE`);
    try {
      const result = await fn();
      await db.run(sql`COMMIT`);
      return result;
    } catch (error) {
      await db.run(sql`ROLLBACK`);
      await recordUnexpected(db, error);
      throw error;
    }
  });
  // Keep the chain alive after a failure.
  queues.set(
    db,
    run.catch(() => undefined),
  );
  return run;
}
