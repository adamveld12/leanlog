import { describe, test, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { createGoalsRepository } from './goals';
import { GoalNotEditableError, type CreateGoal } from '@leanlog/data-access';
import { userProfiles } from '../schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ts = () => new Date().toISOString();

async function seedUser(db: D1Database, clerkUserId: string) {
  const d = drizzle(db);
  await d.insert(userProfiles).values({
    id: uuidv7(),
    clerkUserId,
    createdAt: ts(),
    updatedAt: ts(),
  });
}

function katchGoalInput(overrides: Partial<CreateGoal> = {}): CreateGoal {
  return {
    name: 'Katch cut',
    description: null,
    mode: 'cut',
    targetWeightLbs: null,
    macroFats: 25,
    macroCarbs: 35,
    macroProtein: 40,
    startDate: '2026-07-01',
    endDate: null,
    calorieBasis: 'katch',
    bodyFatPct: 15,
    activityLevel: 'moderate',
    mealSlots: [{ name: 'Breakfast', ingredients: [] }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createGoalsRepository (#63 calorie basis)', () => {
  // Each test uses a unique user so they don't interfere within the shared D1.
  let userId: string;
  const today = '2026-06-16';
  beforeEach(() => {
    userId = `test-user-${uuidv7()}`;
  });

  describe('create', () => {
    test('persists the Katch basis and body-composition snapshot', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);

      const goal = await repo.create(userId, katchGoalInput(), today);

      expect(goal.calorieBasis).toBe('katch');
      expect(goal.bodyFatPct).toBe(15);
      expect(goal.activityLevel).toBe('moderate');
      // Re-read from the DB to confirm it round-trips, not just the create return.
      const reread = await repo.getById(userId, goal.id);
      expect(reread).toMatchObject({
        calorieBasis: 'katch',
        bodyFatPct: 15,
        activityLevel: 'moderate',
      });
    });

    test('defaults a bodyweight goal to null body-composition', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);

      const goal = await repo.create(
        userId,
        katchGoalInput({
          calorieBasis: 'bodyweight',
          bodyFatPct: null,
          activityLevel: null,
          targetWeightLbs: 180,
        }),
        today,
      );

      expect(goal.calorieBasis).toBe('bodyweight');
      expect(goal.bodyFatPct).toBeNull();
      expect(goal.activityLevel).toBeNull();
    });
  });

  describe('update — body-composition lifecycle', () => {
    test('clears body-comp when an editable goal switches to the bodyweight basis', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);
      // A future goal (start after today) is fully editable.
      const goal = await repo.create(userId, katchGoalInput(), today);

      // PATCH only the basis — omit body-comp. The repo must force them to null so
      // the row can't keep stale Katch body-comp on a bodyweight basis (#63 §3).
      const updated = await repo.update(userId, goal.id, { calorieBasis: 'bodyweight' }, today);

      expect(updated.calorieBasis).toBe('bodyweight');
      expect(updated.bodyFatPct).toBeNull();
      expect(updated.activityLevel).toBeNull();
    });

    test('locks the calorie basis on an active goal', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);
      // Goal started before today and still running → active, body-comp is locked.
      const goal = await repo.create(
        userId,
        katchGoalInput({ startDate: '2026-06-01', endDate: '2026-12-31' }),
        '2026-06-01',
      );

      await expect(
        repo.update(userId, goal.id, { calorieBasis: 'bodyweight' }, today),
      ).rejects.toBeInstanceOf(GoalNotEditableError);
    });

    test('allows an active goal to edit name without touching the locked basis', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);
      const goal = await repo.create(
        userId,
        katchGoalInput({ startDate: '2026-06-01', endDate: '2026-12-31' }),
        '2026-06-01',
      );

      const updated = await repo.update(userId, goal.id, { name: 'Renamed' }, today);
      expect(updated.name).toBe('Renamed');
      expect(updated.calorieBasis).toBe('katch');
      expect(updated.bodyFatPct).toBe(15);
    });
  });

  describe('updateBackground', () => {
    test('configures the background goal with the Katch basis, creating it first', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);

      const bg = await repo.updateBackground(userId, {
        calorieBasis: 'katch',
        bodyFatPct: 20,
        activityLevel: 'sedentary',
      });

      expect(bg.isBackground).toBe(true);
      expect(bg.mode).toBe('maintain');
      expect(bg.calorieBasis).toBe('katch');
      expect(bg.bodyFatPct).toBe(20);
      expect(bg.activityLevel).toBe('sedentary');

      // Only one background goal exists (updateBackground reused the ensured row).
      const all = await repo.listByUser(userId);
      expect(all.filter((g) => g.isBackground)).toHaveLength(1);
    });

    test('resetting the background goal to bodyweight clears body-comp', async () => {
      await seedUser(env.DB, userId);
      const repo = createGoalsRepository(env.DB);
      await repo.updateBackground(userId, {
        calorieBasis: 'katch',
        bodyFatPct: 20,
        activityLevel: 'sedentary',
      });

      const reset = await repo.updateBackground(userId, {
        calorieBasis: 'bodyweight',
        bodyFatPct: null,
        activityLevel: null,
      });

      expect(reset.calorieBasis).toBe('bodyweight');
      expect(reset.bodyFatPct).toBeNull();
      expect(reset.activityLevel).toBeNull();
    });
  });
});
