import { asc, eq } from 'drizzle-orm';
import { uuidv7 } from '@leanlog/data-access';
import { errorLog, hcQueue } from '../schema';
import { withTransaction } from '../tx';
import type { Db } from '../types';

export type HcQueueItem = typeof hcQueue.$inferSelect;
export type NewHcQueueItem = Pick<
  typeof hcQueue.$inferInsert,
  'op' | 'recordType' | 'clientRecordId' | 'payload'
>;

// Queue a Health Connect write. A later op for the same record replaces the
// pending one (and resets attempts), so edits never pile up. Call inside the
// same transaction as the change that caused it, so no write is lost.
export async function enqueue(db: Db, item: NewHcQueueItem): Promise<void> {
  await db
    .insert(hcQueue)
    .values({ ...item, payload: item.payload ?? null })
    .onConflictDoUpdate({
      target: [hcQueue.recordType, hcQueue.clientRecordId],
      set: { op: item.op, payload: item.payload ?? null, attempts: 0 },
    });
}

export const enqueueNutritionUpsert = (db: Db, mealId: string) =>
  enqueue(db, { op: 'upsert', recordType: 'Nutrition', clientRecordId: `meal:${mealId}` });

export const enqueueNutritionDelete = (db: Db, mealId: string) =>
  enqueue(db, { op: 'delete', recordType: 'Nutrition', clientRecordId: `meal:${mealId}` });

export async function listPending(db: Db): Promise<HcQueueItem[]> {
  return db.select().from(hcQueue).orderBy(asc(hcQueue.id));
}

export async function remove(db: Db, id: number): Promise<void> {
  await db.delete(hcQueue).where(eq(hcQueue.id, id));
}

// How many failed attempts before a sync problem is recorded in the local log.
const LOG_AFTER_ATTEMPTS = 3;

// Count a failed send and keep the item for the next flush. The third failure
// is logged locally with the record type and reason, never the payload.
export function markFailed(db: Db, item: HcQueueItem, reason: string): Promise<void> {
  return withTransaction(db, async () => {
    const attempts = item.attempts + 1;
    await db.update(hcQueue).set({ attempts }).where(eq(hcQueue.id, item.id));
    if (attempts === LOG_AFTER_ATTEMPTS) {
      await db.insert(errorLog).values({
        id: uuidv7(),
        at: new Date().toISOString(),
        source: 'health-connect',
        message: `${item.recordType} sync failed after ${attempts} attempts: ${reason}`,
      });
    }
  });
}
