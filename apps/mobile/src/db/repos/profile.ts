import { eq } from 'drizzle-orm';
import { MobileProfileSchema, minProfileDelta, type MobileProfile } from '@leanlog/data-access';
import { profile } from '../schema';
import { withTransaction } from '../tx';
import type { Db } from '../types';
import { getProfile } from './base';
import { enqueue } from './hcQueue';
import { deriveInputs, refreshTodayRow } from './targets';

export { ensureSeeded, getProfile } from './base';

// Thrown when a calorie delta would push carb calories below 0 (R18).
export class DeltaBelowFloorError extends Error {
  readonly minDelta: number;
  constructor(minDelta: number) {
    super(`Calorie delta can't go below ${minDelta}`);
    this.name = 'DeltaBelowFloorError';
    this.minDelta = minDelta;
  }
}

// Validate and write a profile patch. Runs inside the caller's transaction.
export async function applyProfilePatch(
  db: Db,
  today: string,
  patch: Partial<MobileProfile>,
): Promise<void> {
  const current = await getProfile(db);
  const merged = MobileProfileSchema.parse({ ...current, ...patch });
  if (patch.calorieDelta !== undefined) {
    const min = minProfileDelta(await deriveInputs(db, today, merged));
    if (merged.calorieDelta < min) throw new DeltaBelowFloorError(min);
  }
  await db.update(profile).set(merged).where(eq(profile.id, 1));
  if (merged.heightIn != null && merged.heightIn !== current.heightIn) {
    await enqueue(db, {
      op: 'upsert',
      recordType: 'Height',
      clientRecordId: `height:${today}`,
      payload: { heightIn: merged.heightIn, at: new Date().toISOString() },
    });
  }
}

// Update the calorie profile; today's targets re-derive in the same transaction.
export function updateProfile(db: Db, today: string, patch: Partial<MobileProfile>): Promise<void> {
  return withTransaction(db, async () => {
    await applyProfilePatch(db, today, patch);
    await refreshTodayRow(db, today);
  });
}
