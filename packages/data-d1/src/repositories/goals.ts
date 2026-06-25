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
  UpdateBackgroundGoal,
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
      calorieBasis: row.calorieBasis,
      bodyFatPct: row.bodyFatPct ?? null,
      activityLevel: row.activityLevel ?? null,
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
      return ensureBackgroundFor(userId);
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
        // Calorie basis + body-comp snapshot (#63). Schema enforces R6 coherence.
        calorieBasis: data.calorieBasis,
        bodyFatPct: data.bodyFatPct ?? null,
        activityLevel: data.activityLevel ?? null,
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

      assertEditAllowed(goal, lifecycle, data);

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
      // Body-comp fields move together (#63 R6); the schema rejects an incoherent
      // triple before we get here, and assertEditAllowed locks them once active.
      // When the basis switches to bodyweight, force the body-comp columns to null
      // even if the patch omits them, so a partial PATCH can never leave a
      // bodyweight row carrying stale Katch body-comp.
      if (data.calorieBasis !== undefined) {
        patch.calorieBasis = data.calorieBasis;
        if (data.calorieBasis === 'bodyweight') {
          patch.bodyFatPct = null;
          patch.activityLevel = null;
        }
      }
      if (data.bodyFatPct !== undefined) patch.bodyFatPct = data.bodyFatPct ?? null;
      if (data.activityLevel !== undefined) patch.activityLevel = data.activityLevel ?? null;
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

    async updateBackground(userId, data: UpdateBackgroundGoal) {
      // The background goal is otherwise read-only; only its basis + body-comp are
      // user-editable (#63 R19/R21). Ensure it exists, then patch just those three
      // fields. Mode stays Maintain (R22) and dates remain open.
      const bg = await ensureBackgroundFor(userId);
      const ts = now();
      await d
        .update(goals)
        .set({
          calorieBasis: data.calorieBasis,
          bodyFatPct: data.bodyFatPct ?? null,
          activityLevel: data.activityLevel ?? null,
          updatedAt: ts,
        })
        .where(and(eq(goals.id, bg.id), eq(goals.userId, userId)));
      const updated = await getOwned(userId, bg.id);
      return updated!;
    },
  };

  // Shared by ensureBackground (public) and updateBackground so the latter always
  // has a row to patch even on first configuration.
  async function ensureBackgroundFor(userId: string): Promise<Goal> {
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
      calorieBasis: 'bodyweight',
      bodyFatPct: null,
      activityLevel: null,
      mealSlotsJson: JSON.stringify(DEFAULT_MEAL_SLOTS),
      createdAt: ts,
      updatedAt: ts,
    });
    const created = await getOwned(userId, id);
    return created!;
  }
}

// Enforces which fields a lifecycle state may change (R47–R52). For active goals
// only *actual* changes to immutable fields are rejected — a save that echoes the
// goal's existing values (e.g. the edit form re-sending unchanged meal slots while
// the user only tweaks the name) is a no-op and is allowed. This keeps a benign
// re-save from failing when the goal's lifecycle has shifted to active since the
// edit form was opened.
function assertEditAllowed(goal: Goal, lifecycle: GoalLifecycle, data: UpdateGoal): void {
  if (lifecycle === 'background')
    throw new GoalNotEditableError('The background goal is read-only');
  if (lifecycle === 'past') throw new GoalNotEditableError('Past goals are read-only');
  if (lifecycle === 'future' || lifecycle === 'today') return; // fully editable

  // Active (older than today): name, description, end date, and delta only.
  const changes: { field: string; changed: boolean }[] = [
    { field: 'mode', changed: data.mode !== undefined && data.mode !== goal.mode },
    {
      field: 'targetWeightLbs',
      changed:
        data.targetWeightLbs !== undefined &&
        (data.targetWeightLbs ?? null) !== (goal.targetWeightLbs ?? null),
    },
    {
      field: 'macroFats',
      changed: data.macroFats !== undefined && data.macroFats !== goal.macroFats,
    },
    {
      field: 'macroCarbs',
      changed: data.macroCarbs !== undefined && data.macroCarbs !== goal.macroCarbs,
    },
    {
      field: 'macroProtein',
      changed: data.macroProtein !== undefined && data.macroProtein !== goal.macroProtein,
    },
    {
      field: 'startDate',
      changed:
        data.startDate !== undefined && (data.startDate ?? null) !== (goal.startDate ?? null),
    },
    {
      field: 'calorieBasis',
      changed: data.calorieBasis !== undefined && data.calorieBasis !== goal.calorieBasis,
    },
    {
      field: 'bodyFatPct',
      changed:
        data.bodyFatPct !== undefined && (data.bodyFatPct ?? null) !== (goal.bodyFatPct ?? null),
    },
    {
      field: 'activityLevel',
      changed:
        data.activityLevel !== undefined &&
        (data.activityLevel ?? null) !== (goal.activityLevel ?? null),
    },
    {
      field: 'mealSlots',
      changed:
        data.mealSlots !== undefined &&
        JSON.stringify(data.mealSlots) !== JSON.stringify(goal.mealSlots),
    },
  ];
  const blocked = changes.find((c) => c.changed);
  if (blocked) throw new GoalNotEditableError(`Active goals cannot change ${blocked.field}`);
}
