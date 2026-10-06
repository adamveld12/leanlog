import { hcQueue } from '../schema';
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
