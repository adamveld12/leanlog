import { sql } from 'drizzle-orm';
import { uuidv7 } from '@leanlog/data-access';
import { errorLog } from '../schema';
import type { Db } from '../types';

// The local log keeps this many of the most recent entries (and exports them).
export const ERROR_LOG_LIMIT = 200;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Append to the local error log. Only the source and message are kept, never data
// such as queued payloads. Single statements, so it is safe to call after a rollback.
export async function logError(db: Db, source: string, error: unknown): Promise<void> {
  await db.insert(errorLog).values({
    id: uuidv7(),
    at: new Date().toISOString(),
    source,
    message: messageOf(error),
  });
  await db.run(
    sql`DELETE FROM error_log WHERE id NOT IN (SELECT id FROM error_log ORDER BY at DESC, id DESC LIMIT ${ERROR_LOG_LIMIT})`,
  );
}
