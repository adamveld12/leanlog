import { createTestDb } from '../../test/db';
import { PastDayLockedError } from '../errors';
import { saveBodyFatResult } from './body';
import { getDay, listDays, setMeasurements, setWeight } from './days';
import { DeltaBelowFloorError, ensureSeeded, getProfile, updateProfile } from './profile';
import { ensureToday } from './targets';

const TODAY = '2026-10-06';
const YESTERDAY = '2026-10-05';

async function seeded() {
  const db = createTestDb();
  await ensureSeeded(db);
  return db;
}

describe('targets for today', () => {
  it('AE5: falls back to weight x 15 before any body fat result', async () => {
    const db = await seeded();
    await setWeight(db, TODAY, TODAY, {
      weightLbs: 180,
      source: 'manual',
      at: `${TODAY}T07:10:00Z`,
    });
    const day = await getDay(db, TODAY);
    expect(day).toMatchObject({ basis: 'bodyweight', targetCalories: 2700, weightLbs: 180 });
  });

  it('uses 180 lb when nothing has ever been logged', async () => {
    const db = await seeded();
    await ensureToday(db, TODAY);
    expect((await getDay(db, TODAY))?.targetCalories).toBe(2700);
  });

  it('switches to Katch once a body fat result is saved', async () => {
    const db = await seeded();
    await setWeight(db, TODAY, TODAY, {
      weightLbs: 180,
      source: 'manual',
      at: `${TODAY}T07:10:00Z`,
    });
    await saveBodyFatResult(db, TODAY, { method: 'navy', pct: 15, inputs: { neckIn: 15 } });
    expect(await getDay(db, TODAY)).toMatchObject({ basis: 'katch', targetCalories: 1869 });
  });
});

describe('AE8: past days keep their targets', () => {
  it('a profile change re-derives only today', async () => {
    const db = await seeded();
    // Yesterday ended at 1869 kcal.
    await setWeight(db, YESTERDAY, YESTERDAY, {
      weightLbs: 180,
      source: 'manual',
      at: `${YESTERDAY}T07:00:00Z`,
    });
    await saveBodyFatResult(db, YESTERDAY, { method: 'navy', pct: 15, inputs: {} });
    expect((await getDay(db, YESTERDAY))?.targetCalories).toBe(1869);

    // A new day starts; today's targets come from the same inputs.
    await ensureToday(db, TODAY);
    await updateProfile(db, TODAY, { activityLevel: 'moderate' });

    expect((await getDay(db, TODAY))?.targetCalories).toBe(2897);
    expect((await getDay(db, YESTERDAY))?.targetCalories).toBe(1869);
  });

  it('new weights and body fat results never rewrite earlier days', async () => {
    const db = await seeded();
    await setWeight(db, YESTERDAY, YESTERDAY, { weightLbs: 180, source: 'manual', at: 'a' });
    const before = await getDay(db, YESTERDAY);
    await setWeight(db, TODAY, TODAY, { weightLbs: 170, source: 'manual', at: 'b' });
    await saveBodyFatResult(db, TODAY, { method: 'jp3', pct: 10, inputs: {} });
    expect(await getDay(db, YESTERDAY)).toEqual(before);
    expect((await listDays(db)).map((d) => d.date)).toEqual([YESTERDAY, TODAY]);
  });
});

describe('past days are locked', () => {
  it('rejects weight and measurement edits on a past date', async () => {
    const db = await seeded();
    await setWeight(db, YESTERDAY, YESTERDAY, { weightLbs: 180, source: 'manual', at: 'a' });
    // Only the ensure path for today may create rows; a later call for yesterday must fail.
    await expect(
      setWeight(db, TODAY, YESTERDAY, { weightLbs: 175, source: 'manual', at: 'b' }),
    ).rejects.toBeInstanceOf(PastDayLockedError);
    await expect(setMeasurements(db, TODAY, YESTERDAY, { waistIn: 30 })).rejects.toBeInstanceOf(
      PastDayLockedError,
    );
    expect((await getDay(db, YESTERDAY))?.weightLbs).toBe(180);
  });
});

describe('profile', () => {
  it('AE4: rejects a delta below the floor and reports the minimum', async () => {
    const db = await seeded();
    await setWeight(db, TODAY, TODAY, { weightLbs: 180, source: 'manual', at: 'a' });
    await saveBodyFatResult(db, TODAY, { method: 'navy', pct: 15, inputs: {} });
    await updateProfile(db, TODAY, { activityLevel: 'moderate' });
    const error = await updateProfile(db, TODAY, { calorieDelta: -1800 }).catch((e) => e);
    expect(error).toBeInstanceOf(DeltaBelowFloorError);
    expect(error.minDelta).toBe(-1775);
    await updateProfile(db, TODAY, { calorieDelta: -1775 });
    expect((await getProfile(db)).calorieDelta).toBe(-1775);
  });

  it('rejects a macro split that does not sum to 100', async () => {
    const db = await seeded();
    await expect(updateProfile(db, TODAY, { macroFats: 50 })).rejects.toThrow();
    expect((await getProfile(db)).macroFats).toBe(30);
  });
});
