import { and, desc, eq, isNotNull, lte } from 'drizzle-orm';
import {
  FALLBACK_WEIGHT_LBS,
  profileTargets,
  type MobileDay,
  type MobileProfile,
  type ProfileTargetInputs,
} from '@leanlog/data-access';
import { bodyFatResults, days } from '../schema';
import type { Db } from '../types';
import { getProfile } from './base';
import { withTransaction } from '../tx';

async function latestWeightOnOrBefore(db: Db, date: string): Promise<number | null> {
  const [row] = await db
    .select({ weightLbs: days.weightLbs })
    .from(days)
    .where(and(lte(days.date, date), isNotNull(days.weightLbs)))
    .orderBy(desc(days.date))
    .limit(1);
  return row?.weightLbs ?? null;
}

async function latestBodyFatOnOrBefore(db: Db, date: string) {
  const [row] = await db
    .select()
    .from(bodyFatResults)
    .where(lte(bodyFatResults.date, date))
    // uuidv7 ids sort by creation time, so ties on date pick the newest.
    .orderBy(desc(bodyFatResults.date), desc(bodyFatResults.id))
    .limit(1);
  return row ?? null;
}

// Inputs for today's targets: the profile, latest weight on or before `today`
// (else the onboarding weight, else 180 lb), and the latest body fat result.
export async function deriveInputs(
  db: Db,
  today: string,
  profileOverride?: MobileProfile,
): Promise<ProfileTargetInputs> {
  const p = profileOverride ?? (await getProfile(db));
  const weight =
    (await latestWeightOnOrBefore(db, today)) ?? p.onboardingWeightLbs ?? FALLBACK_WEIGHT_LBS;
  const bf = await latestBodyFatOnOrBefore(db, today);
  return {
    weightLbs: weight,
    bodyFatPct: bf?.pct ?? null,
    activityLevel: p.activityLevel,
    calorieDelta: p.calorieDelta,
    macroFats: p.macroFats,
    macroCarbs: p.macroCarbs,
    macroProtein: p.macroProtein,
  };
}

async function targetColumns(db: Db, today: string) {
  const t = profileTargets(await deriveInputs(db, today));
  return {
    targetCalories: t.targetCalories,
    targetFat: t.targetFat,
    targetCarbs: t.targetCarbs,
    targetProtein: t.targetProtein,
    basis: t.basis,
  };
}

// Create today's row from the current inputs if it doesn't exist. Runs inside
// the caller's transaction.
export async function ensureDayRow(db: Db, today: string): Promise<MobileDay> {
  const [existing] = await db.select().from(days).where(eq(days.date, today));
  if (existing) return existing;
  await db.insert(days).values({ date: today, ...(await targetColumns(db, today)) });
  const [created] = await db.select().from(days).where(eq(days.date, today));
  return created;
}

// Re-derive today's targets. Only today's row is ever written (R21): past rows
// keep the targets they ended with.
export async function refreshTodayRow(db: Db, today: string): Promise<void> {
  await ensureDayRow(db, today);
  await db
    .update(days)
    .set(await targetColumns(db, today))
    .where(eq(days.date, today));
}

export function ensureToday(db: Db, today: string): Promise<MobileDay> {
  return withTransaction(db, () => ensureDayRow(db, today));
}
