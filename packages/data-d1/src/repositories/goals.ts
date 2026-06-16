import { and, asc, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { goals } from '../schema';
import {
  GOAL_DEFAULTS,
  DEFAULT_MEAL_SLOTS,
  parseMealSlotsJson,
  goalLifecycle,
  validateNewGoal,
  GoalOverlapError,
  TooManyFutureGoalsError,
  GoalDateError,
  GoalNotEditableError,
  GoalNotDeletableError,
} from '@leanlog/data-access';
import type {
  GoalsRepository,
  Goal,
  CreateGoal,
  UpdateGoal,
  GoalLifecycle,
} from '@leanlog/data-access';

export function createGoalsRepository(db: D1Database): GoalsRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  function rowToGoal(row: typeof goals.$inferSelect): Goal {
    return {
      id: row.id,
      userId: row.userId,
      isBackground: row.isBackground,
      name: row.name ?? null,
      description: row.description ?? null,
      mode: row.mode,
      targetWeightLbs: row.targetWeightLbs ?? null,
      macroFats: row.macroFats,
      macroCarbs: row.macroCarbs,
      macroProtein: row.macroProtein,
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
      calorieDelta: row.calorieDelta,
      mealSlots: parseMealSlotsJson(row.mealSlotsJson),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async function selectByUser(userId: string): Promise<Goal[]> {
    const rows = await d
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(asc(goals.startDate));
    return rows.map(rowToGoal);
  }

  // Background last, user goals ordered by start date — the order the timeline
  // and validation expect.
  function order(list: Goal[]): Goal[] {
    const user = list.filter((g) => !g.isBackground);
    const background = list.filter((g) => g.isBackground);
    return [...user, ...background];
  }

  async function getOwned(userId: string, goalId: string): Promise<Goal | null> {
    const rows = await d.select().from(goals).where(eq(goals.id, goalId));
    const row = rows[0];
    if (!row || row.userId !== userId) return null;
    return rowToGoal(row);
  }

  return {
    async ensureBackground(userId) {
      const existing = await selectByUser(userId);
      const bg = existing.find((g) => g.isBackground);
      if (bg) return bg;

      const id = uuidv7();
      const ts = now();
      await d.insert(goals).values({
        id,
        userId,
        isBackground: true,
        name: 'Maintenance',
        description: null,
        mode: GOAL_DEFAULTS.mode,
        targetWeightLbs: null,
        macroFats: GOAL_DEFAULTS.macroFats,
        macroCarbs: GOAL_DEFAULTS.macroCarbs,
        macroProtein: GOAL_DEFAULTS.macroProtein,
        startDate: null,
        endDate: null,
        calorieDelta: 0,
        mealSlotsJson: JSON.stringify(DEFAULT_MEAL_SLOTS),
        createdAt: ts,
        updatedAt: ts,
      });
      const created = await getOwned(userId, id);
      return created!;
    },

    async listByUser(userId) {
      return order(await selectByUser(userId));
    },

    getById(userId, goalId) {
      return getOwned(userId, goalId);
    },

    async create(userId, data: CreateGoal, today) {
      const existing = await selectByUser(userId);
      const userGoals = existing.filter((g) => !g.isBackground);

      const violation = validateNewGoal(
        {
          startDate: data.startDate,
          endDate: data.endDate ?? null,
          macroFats: data.macroFats,
          macroCarbs: data.macroCarbs,
          macroProtein: data.macroProtein,
        },
        userGoals,
        today,
      );
      if (violation) {
        switch (violation.code) {
          case 'start_in_past':
            throw new GoalDateError('Start date cannot be in the past');
          case 'end_before_start':
            throw new GoalDateError('End date must be after start date');
          case 'macros_sum':
            throw new GoalDateError('Macro percentages must total 100');
          case 'overlap':
            throw new GoalOverlapError(violation.conflictingGoalId);
          case 'too_many_future':
            throw new TooManyFutureGoalsError();
        }
      }

      const id = uuidv7();
      const ts = now();
      await d.insert(goals).values({
        id,
        userId,
        isBackground: false,
        name: data.name ?? null,
        description: data.description ?? null,
        mode: data.mode,
        targetWeightLbs: data.targetWeightLbs,
        macroFats: data.macroFats,
        macroCarbs: data.macroCarbs,
        macroProtein: data.macroProtein,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        // New goals always start with no delta (R20/R21).
        calorieDelta: 0,
        mealSlotsJson: JSON.stringify(data.mealSlots ?? DEFAULT_MEAL_SLOTS),
        createdAt: ts,
        updatedAt: ts,
      });
      const created = await getOwned(userId, id);
      return created!;
    },

    async update(userId, goalId, data: UpdateGoal, today) {
      const goal = await getOwned(userId, goalId);
      if (!goal) throw new GoalNotEditableError('Goal not found');
      const lifecycle = goalLifecycle(goal, today);

      assertEditAllowed(lifecycle, data);

      // Future goals can never carry a non-zero delta (R21).
      if (lifecycle === 'future' && data.calorieDelta != null && data.calorieDelta !== 0) {
        throw new GoalNotEditableError('Future goals cannot set a calorie delta');
      }

      const nextStart = data.startDate ?? goal.startDate;
      const nextEnd = data.endDate !== undefined ? data.endDate : goal.endDate;
      if (nextStart != null && nextEnd != null && nextEnd <= nextStart) {
        throw new GoalDateError('End date must be after start date');
      }

      const ts = now();
      const patch: Partial<typeof goals.$inferInsert> = { updatedAt: ts };
      if (data.name !== undefined) patch.name = data.name ?? null;
      if (data.description !== undefined) patch.description = data.description ?? null;
      if (data.mode !== undefined) patch.mode = data.mode;
      if (data.targetWeightLbs !== undefined) patch.targetWeightLbs = data.targetWeightLbs ?? null;
      if (data.macroFats !== undefined) patch.macroFats = data.macroFats;
      if (data.macroCarbs !== undefined) patch.macroCarbs = data.macroCarbs;
      if (data.macroProtein !== undefined) patch.macroProtein = data.macroProtein;
      if (data.startDate !== undefined) patch.startDate = data.startDate ?? null;
      if (data.endDate !== undefined) patch.endDate = data.endDate ?? null;
      if (data.calorieDelta !== undefined) patch.calorieDelta = data.calorieDelta;
      if (data.mealSlots !== undefined) patch.mealSlotsJson = JSON.stringify(data.mealSlots);

      await d
        .update(goals)
        .set(patch)
        .where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
      const updated = await getOwned(userId, goalId);
      return updated!;
    },

    async delete(userId, goalId, today) {
      const goal = await getOwned(userId, goalId);
      if (!goal) return;
      const lifecycle = goalLifecycle(goal, today);
      if (lifecycle !== 'future' && lifecycle !== 'today') throw new GoalNotDeletableError();
      await d.delete(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
    },
  };
}

// Enforces which fields a lifecycle state may change (R47–R52).
function assertEditAllowed(lifecycle: GoalLifecycle, data: UpdateGoal): void {
  if (lifecycle === 'background')
    throw new GoalNotEditableError('The background goal is read-only');
  if (lifecycle === 'past') throw new GoalNotEditableError('Past goals are read-only');
  if (lifecycle === 'future' || lifecycle === 'today') return; // fully editable
  // Active (older than today): name, description, end date, and delta only.
  const blocked: (keyof UpdateGoal)[] = [
    'mode',
    'targetWeightLbs',
    'macroFats',
    'macroCarbs',
    'macroProtein',
    'startDate',
    'mealSlots',
  ];
  for (const field of blocked) {
    if (data[field] !== undefined) {
      throw new GoalNotEditableError(`Active goals cannot change ${String(field)}`);
    }
  }
}
