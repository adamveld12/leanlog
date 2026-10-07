import { createTestDb } from '../../test/db';
import { saveBodyFatResult } from './body';
import { exportAll } from './exportImport';
import { ensureSeeded } from './base';
import { enqueue, listPending, markFailed, remove } from './hcQueue';
import { updateProfile } from './profile';

const TODAY = '2026-10-06';

async function setup() {
  const db = createTestDb();
  await ensureSeeded(db);
  return db;
}

describe('hc queue', () => {
  it('keeps one pending row per record: a later op replaces the earlier one', async () => {
    const db = await setup();
    await enqueue(db, { op: 'upsert', recordType: 'Nutrition', clientRecordId: 'meal:a' });
    await enqueue(db, { op: 'delete', recordType: 'Nutrition', clientRecordId: 'meal:a' });
    await enqueue(db, { op: 'upsert', recordType: 'Nutrition', clientRecordId: 'meal:b' });
    const pending = await listPending(db);
    expect(pending.map((p) => [p.clientRecordId, p.op])).toEqual([
      ['meal:a', 'delete'],
      ['meal:b', 'upsert'],
    ]);
  });

  it('removes sent items', async () => {
    const db = await setup();
    await enqueue(db, { op: 'upsert', recordType: 'Nutrition', clientRecordId: 'meal:a' });
    const [item] = await listPending(db);
    await remove(db, item);
    expect(await listPending(db)).toEqual([]);
  });

  it('does not remove an item that was re-queued after it was read (an edit during a send)', async () => {
    const db = await setup();
    await enqueue(db, { op: 'upsert', recordType: 'Nutrition', clientRecordId: 'meal:a' });
    const [read] = await listPending(db);
    // The user edits the meal while the send for `read` is in flight.
    await enqueue(db, { op: 'upsert', recordType: 'Nutrition', clientRecordId: 'meal:a' });
    await remove(db, read);
    const pending = await listPending(db);
    expect(pending).toHaveLength(1);
    expect(pending[0].version).toBeGreaterThan(read.version);
  });

  it('counts failures, keeps the item, and logs locally on the third (no payload in the log)', async () => {
    const db = await setup();
    await enqueue(db, {
      op: 'upsert',
      recordType: 'Weight',
      clientRecordId: 'weight:2026-10-06',
      payload: { weightLbs: 181, at: 'x' },
    });
    const [item] = await listPending(db);
    await markFailed(db, item, 'permission denied');
    await markFailed(db, { ...item, attempts: 1 }, 'permission denied');
    expect((await exportAll(db)).errorLog).toEqual([]);
    await markFailed(db, { ...item, attempts: 2 }, 'permission denied');

    const [after] = await listPending(db);
    expect(after.attempts).toBe(3);
    const log = (await exportAll(db)).errorLog;
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ source: 'health-connect' });
    expect(log[0].message).toContain('Weight');
    expect(log[0].message).toContain('permission denied');
    expect(log[0].message).not.toContain('181');
  });
});

describe('queued payloads carry a timestamp (used as the record version)', () => {
  it('body fat and height', async () => {
    const db = await setup();
    await updateProfile(db, TODAY, { heightIn: 72 });
    await saveBodyFatResult(db, TODAY, { method: 'navy', pct: 17, inputs: {} });
    const byType = Object.fromEntries(
      (await listPending(db)).map((p) => [p.recordType, p.payload]),
    );
    expect(byType.Height).toMatchObject({ heightIn: 72, at: expect.any(String) });
    expect(byType.BodyFat).toMatchObject({ pct: 17, at: expect.any(String) });
  });
});
