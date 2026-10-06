import { sql } from 'drizzle-orm';
import type { Db } from './types';

// Atomic multi-row writes (the on-device equivalent of D1's `batch`).
//
// drizzle's `db.transaction(async …)` can't run on the better-sqlite3 driver the
// repo tests use, so we issue BEGIN/COMMIT ourselves. A per-database queue keeps
// two transactions from interleaving on the one connection. Public repo
// functions open a transaction; the helpers they call take the same `Db` and
// must not call `withTransaction` again (it would wait on itself).
const queues = new WeakMap<object, Promise<unknown>>();

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
