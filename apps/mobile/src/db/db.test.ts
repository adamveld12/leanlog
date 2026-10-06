import { count } from 'drizzle-orm';
import { createTestDb } from '../test/db';
import { days, meals } from './schema';
import { withTransaction } from './tx';

const day = {
  date: '2026-10-06',
  targetCalories: 1869,
  targetFat: 62,
  targetCarbs: 187,
  targetProtein: 140,
  basis: 'katch' as const,
};

describe('bundled migrations', () => {
  it('create a usable schema with foreign keys enforced', async () => {
    const db = createTestDb();
    await db.insert(days).values(day);
    await expect(
      db.insert(meals).values({ id: 'm', date: '1999-01-01', name: 'x', position: 0 }),
    ).rejects.toThrow();
  });
});

describe('withTransaction', () => {
  it('commits on success and rolls back everything on failure', async () => {
    const db = createTestDb();
    await withTransaction(db, async () => {
      await db.insert(days).values(day);
    });
    await expect(
      withTransaction(db, async () => {
        await db.insert(days).values({ ...day, date: '2026-10-07' });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    const [row] = await db.select({ n: count() }).from(days);
    expect(row.n).toBe(1);
  });

  it('serialises overlapping transactions', async () => {
    const db = createTestDb();
    const order: string[] = [];
    await Promise.all([
      withTransaction(db, async () => {
        order.push('a:start');
        await Promise.resolve();
        order.push('a:end');
      }),
      withTransaction(db, async () => {
        order.push('b:start');
        order.push('b:end');
      }),
    ]);
    expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
  });
});
