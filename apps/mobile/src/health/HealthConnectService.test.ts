import { ensureSeeded } from '../db/repos/base';
import { exportAll } from '../db/repos/exportImport';
import { getDay, setWeight } from '../db/repos/days';
import { listPending } from '../db/repos/hcQueue';
import {
  addIngredient,
  addMeal,
  deleteMeal,
  removeIngredient,
  updateIngredient,
} from '../db/repos/meals';
import { createTestDb } from '../test/db';
import { FakeHealthConnect } from '../test/fakeHealthConnect';
import { createHealthConnectService } from './HealthConnectService';

const OWN = 'app.leanlog.mobile';
const TODAY = '2026-10-06';
const local = (h: number, m: number) => new Date(2026, 9, 6, h, m).toISOString();

const rice = {
  name: 'Rice',
  grams: 200,
  calories: 260,
  fat: 0.6,
  saturatedFat: 0.2,
  carbs: 57,
  fiber: 0.8,
  protein: 5.4,
  savedFoodId: null,
};

async function setup(options: Partial<ConstructorParameters<typeof FakeHealthConnect>[0]> = {}) {
  const db = createTestDb();
  await ensureSeeded(db);
  const hc = new FakeHealthConnect({ ownPackage: OWN, ...options });
  const service = createHealthConnectService({ client: hc, db, ownPackage: OWN });
  return { db, hc, service };
}

const scaleReading = (lbs: number, at: string) =>
  ({
    recordType: 'Weight' as const,
    time: at,
    weight: { value: lbs, unit: 'pounds' as const },
    metadata: { clientRecordId: 'scale-1', clientRecordVersion: 1 },
  }) as const;

describe('availability and permissions', () => {
  it('reports unavailable and refuses to connect when Health Connect is missing', async () => {
    const { service } = await setup({ status: 1 });
    expect(await service.status()).toBe('unavailable');
    expect(await service.connect()).toBe(false);
  });

  it('reports when the provider needs an update', async () => {
    const { service } = await setup({ status: 2 });
    expect(await service.status()).toBe('update_required');
  });

  it('asks for read Weight/Height and write Weight/BodyFat/Height/Nutrition, then marks itself connected', async () => {
    const { hc, service } = await setup();
    expect(await service.isConnected()).toBe(false);
    expect(await service.connect()).toBe(true);
    expect(hc.granted.map((p) => `${p.accessType}:${p.recordType}`).sort()).toEqual([
      'read:Height',
      'read:Weight',
      'write:BodyFat',
      'write:Height',
      'write:Nutrition',
      'write:Weight',
    ]);
    expect(await service.isConnected()).toBe(true);
  });

  it('stays disconnected when the user denies everything', async () => {
    const { service } = await setup({ grant: () => [] });
    expect(await service.connect()).toBe(false);
    expect(await service.isConnected()).toBe(false);
  });
});

describe('writing to Health Connect (queue flush)', () => {
  it('without a connection nothing is sent and the queue keeps recording', async () => {
    const { db, hc, service } = await setup();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, meal.id, rice);
    await service.flushQueue();
    expect(hc.insertCalls).toBe(0);
    expect(await listPending(db)).toHaveLength(1);
  });

  it('Lunch: one record after save and after edit, none after delete', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    const ing = await addIngredient(db, TODAY, meal.id, rice);
    await service.flushQueue();
    expect(hc.recordsOfType('Nutrition')).toHaveLength(1);
    expect(hc.recordsOfType('Nutrition')[0]).toMatchObject({
      name: 'Lunch',
      mealType: 2,
      energy: { value: 260, unit: 'kilocalories' },
      metadata: { clientRecordId: `meal:${meal.id}` },
    });
    expect(await listPending(db)).toEqual([]);

    await updateIngredient(db, TODAY, ing.id, { calories: 300, grams: 250 });
    await service.flushQueue();
    expect(hc.recordsOfType('Nutrition')).toHaveLength(1);
    expect(hc.recordsOfType('Nutrition')[0]).toMatchObject({ energy: { value: 300 } });

    await deleteMeal(db, TODAY, meal.id);
    await service.flushQueue();
    expect(hc.recordsOfType('Nutrition')).toHaveLength(0);
  });

  it('flushing an empty queue sends nothing, so a relaunch cannot duplicate records', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, meal.id, rice);
    await service.flushQueue();
    const calls = hc.insertCalls;
    await service.flushQueue();
    await service.flushQueue();
    expect(hc.insertCalls).toBe(calls);
    expect(hc.recordsOfType('Nutrition')).toHaveLength(1);
  });

  it('a meal emptied of food is removed from Health Connect rather than written as zero', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    const ing = await addIngredient(db, TODAY, meal.id, rice);
    await service.flushQueue();
    await removeIngredient(db, TODAY, ing.id);
    await service.flushQueue();
    expect(hc.recordsOfType('Nutrition')).toHaveLength(0);
  });

  it('keeps a failed item, counts the attempt, and sends it on the next flush', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, meal.id, rice);
    hc.failInserts = 1;
    await service.flushQueue();
    const [pending] = await listPending(db);
    expect(pending.attempts).toBe(1);
    expect(hc.recordsOfType('Nutrition')).toHaveLength(0);

    await service.flushQueue();
    expect(await listPending(db)).toEqual([]);
    expect(hc.recordsOfType('Nutrition')).toHaveLength(1);
  });

  it('logs locally after three failed attempts, without the payload', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    await setWeight(db, TODAY, TODAY, { weightLbs: 181, source: 'manual', at: local(7, 10) });
    hc.failInserts = 3;
    await service.flushQueue();
    await service.flushQueue();
    await service.flushQueue();
    const log = (await exportAll(db)).errorLog;
    expect(log).toHaveLength(1);
    expect(log[0].message).toContain('Weight');
    expect(log[0].message).not.toContain('181');
  });

  it('only sends record types whose write permission was granted', async () => {
    const { db, hc, service } = await setup({
      grant: (asked) => asked.filter((p) => p.recordType === 'Weight'),
    });
    expect(await service.connect()).toBe(true);
    await setWeight(db, TODAY, TODAY, { weightLbs: 181, source: 'manual', at: local(7, 10) });
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, meal.id, rice);
    await service.flushQueue();
    expect(hc.recordsOfType('Weight')).toHaveLength(1);
    expect(hc.recordsOfType('Nutrition')).toHaveLength(0);
    expect((await listPending(db)).map((p) => p.recordType)).toEqual(['Nutrition']);
  });

  it('an edit made while a send is in flight is not lost', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, meal.id, rice);
    // While the first send is in flight the user adds more food to the same meal.
    hc.onInsert = async () => {
      hc.onInsert = undefined;
      await addIngredient(db, TODAY, meal.id, { ...rice, name: 'Beans', calories: 100 });
    };
    await service.flushQueue();
    // The in-flight send carried the old state, so the meal must still be queued and goes out next.
    expect(await listPending(db)).toHaveLength(0); // flushQueue re-runs until the queue is quiet
    expect(hc.recordsOfType('Nutrition')).toHaveLength(1);
    expect(hc.recordsOfType('Nutrition')[0]).toMatchObject({ energy: { value: 360 } });
  });

  it('overlapping flushes still write each record once', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    const meal = await addMeal(db, TODAY, TODAY, 'Lunch');
    await addIngredient(db, TODAY, meal.id, rice);
    await Promise.all([service.flushQueue(), service.flushQueue(), service.flushQueue()]);
    expect(hc.recordsOfType('Nutrition')).toHaveLength(1);
    expect(await listPending(db)).toEqual([]);
  });
});

describe('importing a smart-scale weight', () => {
  it('uses another app’s reading as today’s weight and re-derives today’s targets', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    hc.addExternal(scaleReading(181.2, local(7, 2)), 'com.scale.app');
    expect(await service.importTodayWeight(TODAY)).toBe(true);
    const day = await getDay(db, TODAY);
    expect(day).toMatchObject({ weightLbs: 181.2, weightSource: 'hc', weightAt: local(7, 2) });
    expect(day?.targetCalories).toBeGreaterThan(2700);
  });

  it('with several readings today, the latest wins', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    hc.addExternal(
      { ...scaleReading(182, local(6, 30)), metadata: { clientRecordId: 'a' } },
      'com.scale.app',
    );
    hc.addExternal(
      { ...scaleReading(181.2, local(7, 2)), metadata: { clientRecordId: 'b' } },
      'com.scale.app',
    );
    await service.importTodayWeight(TODAY);
    expect((await getDay(db, TODAY))?.weightLbs).toBe(181.2);
  });

  it('AE9: a newer manual weight stays, and Leanlog’s own record is never imported', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    hc.addExternal(scaleReading(181.2, local(7, 2)), 'com.scale.app');
    await setWeight(db, TODAY, TODAY, { weightLbs: 181.0, source: 'manual', at: local(7, 10) });
    await service.flushQueue(); // writes Leanlog's own 181.0 record, newer than the scale's
    expect(
      hc
        .recordsOfType('Weight')
        .map((r) => ('weight' in r ? r.weight.value : 0))
        .sort(),
    ).toEqual([181, 181.2]);

    expect(await service.importTodayWeight(TODAY)).toBe(false);
    expect(await getDay(db, TODAY)).toMatchObject({ weightLbs: 181.0, weightSource: 'manual' });
  });

  it('a scale reading newer than the manual one replaces it, and is not written back', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    await setWeight(db, TODAY, TODAY, { weightLbs: 181.0, source: 'manual', at: local(7, 10) });
    await service.flushQueue();
    hc.addExternal(scaleReading(180.4, local(7, 40)), 'com.scale.app');
    expect(await service.importTodayWeight(TODAY)).toBe(true);
    expect(await getDay(db, TODAY)).toMatchObject({ weightLbs: 180.4, weightSource: 'hc' });
    // Imported weights never go back to Health Connect.
    expect(await listPending(db)).toEqual([]);
    await service.flushQueue();
    expect(hc.recordsOfType('Weight')).toHaveLength(2);
  });

  it('is idempotent across foregrounds', async () => {
    const { db, hc, service } = await setup();
    await service.connect();
    hc.addExternal(scaleReading(181.2, local(7, 2)), 'com.scale.app');
    expect(await service.importTodayWeight(TODAY)).toBe(true);
    expect(await service.importTodayWeight(TODAY)).toBe(false);
    expect((await getDay(db, TODAY))?.weightAt).toBe(local(7, 2));
  });

  it('ignores yesterday’s readings and does nothing without read permission', async () => {
    const yesterday = new Date(2026, 9, 5, 7, 0).toISOString();
    const a = await setup();
    await a.service.connect();
    a.hc.addExternal(scaleReading(190, yesterday), 'com.scale.app');
    expect(await a.service.importTodayWeight(TODAY)).toBe(false);

    const b = await setup({ grant: (asked) => asked.filter((p) => p.accessType === 'write') });
    await b.service.connect();
    b.hc.addExternal(scaleReading(181.2, local(7, 2)), 'com.scale.app');
    expect(await b.service.importTodayWeight(TODAY)).toBe(false);
  });
});

describe('hints for onboarding', () => {
  it('reads the latest weight and height from Health Connect', async () => {
    const { hc, service } = await setup();
    await service.connect();
    hc.addExternal(scaleReading(181.2, new Date().toISOString()), 'com.scale.app');
    hc.addExternal(
      {
        recordType: 'Height',
        time: new Date().toISOString(),
        height: { value: 1.8288, unit: 'meters' },
        metadata: { clientRecordId: 'h' },
      },
      'com.scale.app',
    );
    const hints = await service.readProfileHints();
    expect(hints.weightLbs).toBe(181.2);
    expect(hints.heightIn).toBeCloseTo(72, 1);
  });

  it('returns nothing when not connected', async () => {
    const { service } = await setup();
    expect(await service.readProfileHints()).toEqual({ weightLbs: null, heightIn: null });
  });
});
