import type { Permission } from 'react-native-health-connect';
import { getSettings, updateSettings } from '../db/repos/base';
import { getDay, setWeight } from '../db/repos/days';
import { listPending, markFailed, remove, type HcQueueItem } from '../db/repos/hcQueue';
import { getMealWithIngredients } from '../db/repos/meals';
import type { Db } from '../db/types';
import type { HealthConnectClient } from './client';
import {
  SDK_STATUS,
  bodyFatToRecord,
  heightToRecord,
  mealToNutritionRecord,
  weightToRecord,
} from './mapping';

export type HcStatus = 'unavailable' | 'update_required' | 'available';

// What the app asks for: read other apps' weight (a smart scale) and height to
// pre-fill the profile; write the weigh-ins, body fat, height and meal nutrition
// Leanlog records. Measurement sites have no Health Connect record type (R31).
const PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'Height' },
  { accessType: 'write', recordType: 'Weight' },
  { accessType: 'write', recordType: 'BodyFat' },
  { accessType: 'write', recordType: 'Height' },
  { accessType: 'write', recordType: 'Nutrition' },
];

// A burst of edits can re-queue an item while it is being sent; flushing repeats
// until the queue is quiet, but never more than this many passes in one call.
const MAX_PASSES = 5;

type Deps = { client: HealthConnectClient; db: Db; ownPackage: string };

const round1 = (n: number) => Math.round(n * 10) / 10;
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

function numberField(payload: Record<string, unknown> | null, key: string): number {
  const v = payload?.[key];
  if (typeof v !== 'number') throw new Error(`queued payload is missing ${key}`);
  return v;
}
function stringField(payload: Record<string, unknown> | null, key: string): string {
  const v = payload?.[key];
  if (typeof v !== 'string') throw new Error(`queued payload is missing ${key}`);
  return v;
}

// The only place Leanlog talks to Health Connect. Every feature works without
// it: when it is unavailable, disconnected or denied, writes just stay queued.
export function createHealthConnectService({ client, db, ownPackage }: Deps) {
  let flushing: Promise<void> | null = null;
  let flushAgain = false;

  async function status(): Promise<HcStatus> {
    const code = await client.getSdkStatus();
    if (code === SDK_STATUS.available) return 'available';
    if (code === SDK_STATUS.updateRequired) return 'update_required';
    return 'unavailable';
  }

  async function granted(): Promise<Set<string>> {
    const permissions = await client.getGrantedPermissions();
    return new Set(permissions.map((p) => `${p.accessType}:${p.recordType}`));
  }

  async function isConnected(): Promise<boolean> {
    if (!(await getSettings(db)).hcEnabled) return false;
    if ((await status()) !== 'available') return false;
    return (await granted()).size > 0;
  }

  // Ask for permissions. Connected means the user granted at least one write.
  async function connect(): Promise<boolean> {
    if ((await status()) !== 'available') return false;
    await client.initialize();
    const result = await client.requestPermission(PERMISSIONS);
    if (!result.some((p) => p.accessType === 'write')) return false;
    await updateSettings(db, { hcEnabled: true });
    return true;
  }

  async function disconnect(): Promise<void> {
    await updateSettings(db, { hcEnabled: false });
  }

  const del = (item: HcQueueItem) =>
    client.deleteRecordsByUuids(item.recordType, [], [item.clientRecordId]);

  async function send(item: HcQueueItem): Promise<void> {
    if (item.op === 'delete') return del(item);
    switch (item.recordType) {
      case 'Nutrition': {
        const meal = await getMealWithIngredients(db, item.clientRecordId.replace(/^meal:/, ''));
        // A meal that is gone, or has no food left, should not exist in Health Connect.
        if (!meal || meal.ingredients.length === 0) return del(item);
        await client.insertRecords([mealToNutritionRecord(meal, meal.ingredients)]);
        return;
      }
      case 'Weight':
        await client.insertRecords([
          weightToRecord(item.clientRecordId, {
            weightLbs: numberField(item.payload, 'weightLbs'),
            at: stringField(item.payload, 'at'),
          }),
        ]);
        return;
      case 'BodyFat':
        await client.insertRecords([
          bodyFatToRecord(item.clientRecordId, {
            pct: numberField(item.payload, 'pct'),
            at: stringField(item.payload, 'at'),
          }),
        ]);
        return;
      case 'Height':
        await client.insertRecords([
          heightToRecord(item.clientRecordId, {
            heightIn: numberField(item.payload, 'heightIn'),
            at: stringField(item.payload, 'at'),
          }),
        ]);
        return;
    }
  }

  // One pass over the queue. Returns true if an item was re-queued while it was
  // being sent (so another pass is needed).
  async function pass(): Promise<boolean> {
    if (!(await isConnected())) return false;
    const have = await granted();
    let requeued = false;
    for (const item of await listPending(db)) {
      // Not allowed to write this type: leave it queued rather than failing it.
      if (!have.has(`write:${item.recordType}`)) continue;
      try {
        // Items go out one at a time, in queue order, each with its own failure handling.
        // react-doctor-disable-next-line react-doctor/async-await-in-loop
        await send(item);
        if (!(await remove(db, item))) requeued = true;
      } catch (e) {
        await markFailed(db, item, errorMessage(e));
      }
    }
    return requeued;
  }

  function flushQueue(): Promise<void> {
    if (flushing) {
      // Something was queued mid-flush: run again once this one finishes.
      flushAgain = true;
      return flushing;
    }
    flushing = (async () => {
      try {
        let passes = 0;
        let again = true;
        while (again && passes < MAX_PASSES) {
          flushAgain = false;
          passes += 1;
          // Each pass must see the previous one's writes, so passes can't run in parallel.
          // react-doctor-disable-next-line react-doctor/async-await-in-loop
          again = (await pass()) || flushAgain;
        }
      } finally {
        flushing = null;
      }
    })();
    return flushing;
  }

  // Use another app's weight reading (e.g. a smart scale) as today's weight.
  // Newest timestamp wins against a manual weigh-in; Leanlog's own records are
  // never imported (R30), so nothing is counted twice.
  async function importTodayWeight(today: string): Promise<boolean> {
    if (!(await isConnected()) || !(await granted()).has('read:Weight')) return false;
    const [y, m, d] = today.split('-').map(Number);
    const { records } = await client.readRecords('Weight', {
      timeRangeFilter: {
        operator: 'between',
        startTime: new Date(y, m - 1, d).toISOString(),
        endTime: new Date(y, m - 1, d + 1).toISOString(),
      },
      ascendingOrder: false,
      pageSize: 100,
    });
    let latest: (typeof records)[number] | undefined;
    for (const r of records) {
      if (r.metadata?.dataOrigin === ownPackage) continue;
      if (!latest || Date.parse(r.time) > Date.parse(latest.time)) latest = r;
    }
    if (!latest) return false;

    const day = await getDay(db, today);
    if (day?.weightAt && Date.parse(day.weightAt) >= Date.parse(latest.time)) return false;

    await setWeight(db, today, today, {
      weightLbs: round1(latest.weight.inPounds),
      source: 'hc',
      at: latest.time,
    });
    return true;
  }

  // The latest weight and height Health Connect has, to pre-fill onboarding.
  async function readProfileHints(): Promise<{
    weightLbs: number | null;
    heightIn: number | null;
  }> {
    const none = { weightLbs: null, heightIn: null };
    if (!(await isConnected())) return none;
    const have = await granted();
    // Upper bound a day ahead: it only has to include "now" despite clock skew or a
    // record stamped in the same instant, and nothing real is dated in the future.
    const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const filter = { operator: 'before' as const, endTime };
    const options = { timeRangeFilter: filter, ascendingOrder: false, pageSize: 1 };
    let weightLbs: number | null = null;
    let heightIn: number | null = null;
    if (have.has('read:Weight')) {
      const [w] = (await client.readRecords('Weight', options)).records;
      if (w) weightLbs = round1(w.weight.inPounds);
    }
    if (have.has('read:Height')) {
      const [h] = (await client.readRecords('Height', options)).records;
      if (h) heightIn = round1(h.height.inInches);
    }
    return { weightLbs, heightIn };
  }

  // e.g. ['read:Weight', 'write:Nutrition'], for the analytics event and diagnostics.
  async function grantedPermissions(): Promise<string[]> {
    return [...(await granted())].sort();
  }

  async function pendingCount(): Promise<number> {
    return (await listPending(db)).length;
  }

  return {
    status,
    isConnected,
    connect,
    disconnect,
    openSettings: () => client.openHealthConnectSettings(),
    flushQueue,
    importTodayWeight,
    readProfileHints,
    grantedPermissions,
    pendingCount,
  };
}

export type HealthConnectService = ReturnType<typeof createHealthConnectService>;
