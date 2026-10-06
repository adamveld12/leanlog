import { eq } from 'drizzle-orm';
import type { MobileProfile } from '@leanlog/data-access';
import { profile, settings } from '../schema';
import type { Db } from '../types';

export type MobileSettings = {
  units: 'imperial' | 'metric';
  analyticsOptIn: boolean;
  hcEnabled: boolean;
};

// Idempotent: creates the singleton profile and settings rows with defaults.
export async function ensureSeeded(db: Db): Promise<void> {
  await db.insert(profile).values({ id: 1 }).onConflictDoNothing();
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
}

export async function getProfile(db: Db): Promise<MobileProfile> {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1));
  if (!row) throw new Error('Profile row missing; call ensureSeeded first');
  const { id: _id, ...rest } = row;
  return rest;
}

export async function getSettings(db: Db): Promise<MobileSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1));
  if (!row) throw new Error('Settings row missing; call ensureSeeded first');
  const { id: _id, ...rest } = row;
  return rest;
}

export async function updateSettings(db: Db, patch: Partial<MobileSettings>): Promise<void> {
  await db.update(settings).set(patch).where(eq(settings.id, 1));
}
