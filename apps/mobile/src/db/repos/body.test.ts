import { createTestDb } from '../../test/db';
import { hcQueue } from '../schema';
import { getBodyFatTrend, saveBodyFatResult } from './body';
import { getDay } from './days';
import { ensureSeeded, getProfile } from './profile';

const TODAY = '2026-10-06';

describe('saveBodyFatResult', () => {
  it('writes the result, profile edits and measurements in one transaction (R25, R26)', async () => {
    const db = createTestDb();
    await ensureSeeded(db);
    await saveBodyFatResult(db, TODAY, {
      method: 'navy',
      pct: 17,
      inputs: { heightIn: 72, neckIn: 15, waistIn: 34 },
      profilePatch: { sex: 'male', heightIn: 72 },
      measurements: { neckIn: 15, waistIn: 34 },
    });
    expect((await getProfile(db)).heightIn).toBe(72);
    expect(await getDay(db, TODAY)).toMatchObject({ neckIn: 15, waistIn: 34, basis: 'katch' });
    expect(await getBodyFatTrend(db)).toEqual([
      expect.objectContaining({ date: TODAY, pct: 17, method: 'navy' }),
    ]);
    // The result and the changed height are queued for Health Connect.
    const queued = await db.select().from(hcQueue);
    expect(queued.map((q) => [q.recordType, q.op])).toEqual([
      ['Height', 'upsert'],
      ['BodyFat', 'upsert'],
    ]);
  });

  it('rejects out-of-range results without writing anything', async () => {
    const db = createTestDb();
    await ensureSeeded(db);
    await expect(
      saveBodyFatResult(db, TODAY, {
        method: 'navy',
        pct: 60,
        inputs: {},
        measurements: { waistIn: 40 },
      }),
    ).rejects.toThrow();
    expect(await getBodyFatTrend(db)).toEqual([]);
    expect(await getDay(db, TODAY)).toBeNull();
  });
});
