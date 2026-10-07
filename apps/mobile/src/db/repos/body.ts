import { asc, eq } from 'drizzle-orm';
import {
  isUsableBodyFat,
  uuidv7,
  type BodyFatResult,
  type MobileProfile,
} from '@leanlog/data-access';
import { bodyFatResults, days } from '../schema';
import { withTransaction } from '../tx';
import type { Db } from '../types';
import type { MeasurementPatch } from './days';
import { enqueue } from './hcQueue';
import { applyProfilePatch } from './profile';
import { ensureDayRow, refreshTodayRow } from './targets';

export type BodyFatInput = {
  method: BodyFatResult['method'];
  pct: number;
  inputs: Record<string, number>;
  // Values edited inside the calculator are saved back (R26).
  profilePatch?: Partial<MobileProfile>;
  measurements?: MeasurementPatch;
};

export async function getBodyFatTrend(db: Db): Promise<BodyFatResult[]> {
  return db.select().from(bodyFatResults).orderBy(asc(bodyFatResults.date), asc(bodyFatResults.id));
}

// Save a calculator result dated today. The result, profile edits, today's
// measurements and the target re-derive land in one transaction.
export function saveBodyFatResult(db: Db, today: string, input: BodyFatInput): Promise<void> {
  if (!Number.isInteger(input.pct) || !isUsableBodyFat(input.pct)) {
    return Promise.reject(new RangeError(`Body fat ${input.pct}% is outside the supported range`));
  }
  return withTransaction(db, async () => {
    await ensureDayRow(db, today);
    const id = uuidv7();
    await db
      .insert(bodyFatResults)
      .values({ id, date: today, pct: input.pct, method: input.method, inputs: input.inputs });
    if (input.profilePatch) await applyProfilePatch(db, today, input.profilePatch);
    if (input.measurements) {
      await db.update(days).set(input.measurements).where(eq(days.date, today));
    }
    await refreshTodayRow(db, today);
    await enqueue(db, {
      op: 'upsert',
      recordType: 'BodyFat',
      clientRecordId: `bodyfat:${id}`,
      payload: { pct: input.pct, date: today, at: new Date().toISOString() },
    });
  });
}
