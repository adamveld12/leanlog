import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { userProfiles } from '../schema';
import { PROFILE_DEFAULTS } from '@leanlog/data-access';
import type {
  ProfileRepository,
  ProgressPose,
  UserProfile,
  UpdateProfile,
} from '@leanlog/data-access';

const POSE_TO_BASELINE_COLUMN = {
  front: 'frontBaselineDate',
  side: 'sideBaselineDate',
  back: 'backBaselineDate',
} as const satisfies Record<ProgressPose, keyof typeof userProfiles.$inferInsert>;

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
      frontBaselineDate: row.frontBaselineDate ?? null,
      sideBaselineDate: row.sideBaselineDate ?? null,
      backBaselineDate: row.backBaselineDate ?? null,
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

    async setProgressBaseline(clerkUserId, pose: ProgressPose, date) {
      // Ensure the row exists so a first-time baseline pick has somewhere to land.
      await this.getOrCreate(clerkUserId);
      const set: Partial<typeof userProfiles.$inferInsert> = { updatedAt: now() };
      set[POSE_TO_BASELINE_COLUMN[pose]] = date;
      await d.update(userProfiles).set(set).where(eq(userProfiles.clerkUserId, clerkUserId));

      const rows = await d
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.clerkUserId, clerkUserId));
      return rowToProfile(rows[0]!);
    },
  };
}
