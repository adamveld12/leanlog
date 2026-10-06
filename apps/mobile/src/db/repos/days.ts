import { asc, eq } from 'drizzle-orm';
import type { MobileDay } from '@leanlog/data-access';
import { assertEditableDay } from '../errors';
import { days } from '../schema';
import { withTransaction } from '../tx';
import type { Db } from '../types';
import { enqueue } from './hcQueue';
import { ensureDayRow, refreshTodayRow } from './targets';

export type MeasurementPatch = Partial<
  Pick<MobileDay, 'shoulderIn' | 'waistIn' | 'bicepIn' | 'thighIn' | 'neckIn' | 'hipIn'>
>;

export async function getDay(db: Db, date: string): Promise<MobileDay | null> {
  const [row] = await db.select().from(days).where(eq(days.date, date));
  return row ?? null;
}

export async function listDays(db: Db): Promise<MobileDay[]> {
  return db.select().from(days).orderBy(asc(days.date));
}

export type WeightInput = {
  weightLbs: number;
  source: 'manual' | 'hc';
  // ISO timestamp of the reading.
  at: string;
};

// One weight per day (R9). Weights from Health Connect are never queued back
// to it (R30); manual weigh-ins are.
export function setWeight(db: Db, today: string, date: string, input: WeightInput): Promise<void> {
  return withTransaction(db, async () => {
    assertEditableDay(date, today);
    // Statements in one transaction share a single SQLite connection and must run in order.
    // react-doctor-disable-next-line react-doctor/async-parallel
    await ensureDayRow(db, today);
    await db
      .update(days)
      .set({ weightLbs: input.weightLbs, weightSource: input.source, weightAt: input.at })
      .where(eq(days.date, date));
    await refreshTodayRow(db, today);
    if (input.source === 'manual') {
      await enqueue(db, {
        op: 'upsert',
        recordType: 'Weight',
        clientRecordId: `weight:${date}`,
        payload: { weightLbs: input.weightLbs, at: input.at },
      });
    }
  });
}

export function setMeasurements(
  db: Db,
  today: string,
  date: string,
  patch: MeasurementPatch,
): Promise<void> {
  return withTransaction(db, async () => {
    assertEditableDay(date, today);
    await ensureDayRow(db, today);
    await db.update(days).set(patch).where(eq(days.date, date));
  });
}
