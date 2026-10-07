import { sql } from 'drizzle-orm';
import { createTestDb } from '../../test/db';
import { PastDayLockedError } from '../errors';
import { ensureSeeded } from './base';
import { exportAll } from './exportImport';
import { ERROR_LOG_LIMIT, logError } from './errorLog';
import { addMeal } from './meals';
import { withTransaction } from '../tx';

async function setup() {
  const db = createTestDb();
  await ensureSeeded(db);
  return db;
}

describe('error log', () => {
  it('records the source and message', async () => {
    const db = await setup();
    await logError(db, 'backup', new Error('disk full'));
    const [row] = (await exportAll(db)).errorLog;
    expect(row).toMatchObject({ source: 'backup', message: 'disk full' });
  });

  it('keeps only the latest entries', async () => {
    const db = await setup();
    for (let i = 0; i < ERROR_LOG_LIMIT + 5; i += 1) {
      await logError(db, 'test', new Error(`failure ${i}`));
    }
    const log = (await exportAll(db)).errorLog;
    expect(log).toHaveLength(ERROR_LOG_LIMIT);
    expect(log.some((e) => e.message === 'failure 0')).toBe(false);
    expect(log.some((e) => e.message === `failure ${ERROR_LOG_LIMIT + 4}`)).toBe(true);
  });

  it('a failed transaction is logged, after it has been rolled back', async () => {
    const db = await setup();
    await expect(
      withTransaction(db, async () => {
        await db.run(sql`INSERT INTO days (date) VALUES ('boom')`);
      }),
    ).rejects.toThrow();
    const log = (await exportAll(db)).errorLog;
    expect(log).toHaveLength(1);
    expect(log[0].source).toBe('database');
  });

  it('expected errors (a locked day, bad input) are not logged as failures', async () => {
    const db = await setup();
    await expect(addMeal(db, '2026-10-06', '2026-10-05', 'Late')).rejects.toBeInstanceOf(
      PastDayLockedError,
    );
    expect((await exportAll(db)).errorLog).toEqual([]);
  });
});
