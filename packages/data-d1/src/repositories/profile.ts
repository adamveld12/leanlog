import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { userProfiles } from '../schema';
import { PROFILE_DEFAULTS } from '@leanlog/data-access';
import type { ProfileRepository, UserProfile, UpdateProfile } from '@leanlog/data-access';

export function createProfileRepository(db: D1Database): ProfileRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  function rowToProfile(row: typeof userProfiles.$inferSelect): UserProfile {
    return {
      id: row.id,
      clerkUserId: row.clerkUserId,
      weightLbs: row.weightLbs,
      heightInches: row.heightInches,
      calorieMode: row.calorieMode,
      targetCalories: row.targetCalories ?? null,
      macroMode: row.macroMode,
      macroFats: row.macroFats,
      macroCarbs: row.macroCarbs,
      macroProtein: row.macroProtein,
      goalWeightLbs: row.goalWeightLbs ?? null,
      goalBodyFatPct: row.goalBodyFatPct ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  return {
    async getOrCreate(clerkUserId) {
      const rows = await d
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.clerkUserId, clerkUserId));

      if (rows[0]) return rowToProfile(rows[0]);

      const id = uuidv7();
      const ts = now();
      await d.insert(userProfiles).values({
        id,
        clerkUserId,
        ...PROFILE_DEFAULTS,
        createdAt: ts,
        updatedAt: ts,
      });

      const created = await d
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.clerkUserId, clerkUserId));
      return rowToProfile(created[0]!);
    },

    async update(clerkUserId, data: UpdateProfile) {
      const ts = now();
      await d
        .update(userProfiles)
        .set({ ...data, updatedAt: ts })
        .where(eq(userProfiles.clerkUserId, clerkUserId));

      const rows = await d
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.clerkUserId, clerkUserId));
      return rowToProfile(rows[0]!);
    },
  };
}
