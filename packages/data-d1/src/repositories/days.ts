import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { dailyMealLogs, meals, ingredients, goals } from '../schema';
import { copyPlanIngredient, createPlanRepository } from './plans';
import {
  DEFAULT_MEAL_NAMES,
  planMaterialization,
  POSE_TO_KEY,
  setDayPhoto,
} from '@leanlog/data-access';
import type {
  DayRepository,
  CreateDailyMealLog,
  DayTargets,
  PlanMealIngredient,
  ProgressPose,
} from '@leanlog/data-access';

type PlanMealSource = { name: string; ingredients: PlanMealIngredient[] };

// R29/R30/R33: the covering goal's default plan, or the four default-named
// meals when it has none, when the plan was deleted, or when no goal was
// supplied. Replaces the old two-branch resolveMealSources (goal slots vs.
// legacy meal templates) with a single source feeding planMaterialization.
async function resolvePlanMeals(
  db: D1Database,
  userId: string,
  goalId: string | undefined,
): Promise<PlanMealSource[]> {
  const defaults = () => DEFAULT_MEAL_NAMES.map((name) => ({ name, ingredients: [] }));
  if (!goalId) return defaults();
  const d = drizzle(db);
  const rows = await d.select().from(goals).where(eq(goals.id, goalId));
  const goal = rows[0];
  if (!goal || goal.userId !== userId) return []; // preserves today's behavior
  if (!goal.defaultPlanId) return defaults();
  const plan = await createPlanRepository(db).getById(userId, goal.defaultPlanId);
  return plan ? plan.meals : defaults();
}

export function createDayRepository(db: D1Database): DayRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  return {
    async listByUser(userId) {
      const dayRows = await d
        .select()
        .from(dailyMealLogs)
        .where(eq(dailyMealLogs.userId, userId))
        .orderBy(dailyMealLogs.date);

      if (dayRows.length === 0) return [];

      // Use JOINs instead of inArray so queries stay within D1's 100-bound-param
      // cap regardless of how many days/meals the user has accumulated.
      const mealRows = (
        await d
          .select()
          .from(meals)
          .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
          .where(eq(dailyMealLogs.userId, userId))
      ).map((r) => r.meals);

      const ingredientRows = (
        await d
          .select()
          .from(ingredients)
          .innerJoin(meals, eq(ingredients.mealId, meals.id))
          .innerJoin(dailyMealLogs, eq(meals.dailyMealLogId, dailyMealLogs.id))
          .where(eq(dailyMealLogs.userId, userId))
      ).map((r) => r.ingredients);

      return dayRows.map((day) => ({
        ...day,
        targetCalories: day.targetCalories,
        targetFat: day.targetFat,
        targetCarbs: day.targetCarbs,
        targetProtein: day.targetProtein,
        meals: mealRows
          .filter((m) => m.dailyMealLogId === day.id)
          .map((meal) => ({
            ...meal,
            dailyMealLogId: meal.dailyMealLogId,
            ingredients: ingredientRows.filter((i) => i.mealId === meal.id),
          })),
      }));
    },

    async getById(userId, dayId) {
      const rows = await d.select().from(dailyMealLogs).where(eq(dailyMealLogs.id, dayId));
      const day = rows[0];
      if (!day || day.userId !== userId) return null;

      const mealRows = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
      // Join on dayId (1 param) instead of inArray(mealIds) which would hit D1's
      // 100-param cap on a single day with >100 meals.
      const ingredientRows = (
        await d
          .select()
          .from(ingredients)
          .innerJoin(meals, eq(ingredients.mealId, meals.id))
          .where(eq(meals.dailyMealLogId, dayId))
      ).map((r) => r.ingredients);

      return {
        ...day,
        meals: mealRows.map((meal) => ({
          ...meal,
          dailyMealLogId: meal.dailyMealLogId,
          ingredients: ingredientRows.filter((i) => i.mealId === meal.id),
        })),
      };
    },

    async create(userId, data: CreateDailyMealLog) {
      const id = uuidv7();
      const ts = now();

      // The day's meal structure is snapshot on create so later goal/plan edits
      // can never touch a day that already exists (R59, R32). Day creation is
      // the degenerate case of plan application (R29): materializing against
      // an empty day means every plan meal appends (#84).
      const planMeals = await resolvePlanMeals(db, userId, data.goalId);
      const actions = planMaterialization(planMeals, []);

      // Build every meal + ingredient insert up front so the whole day — day row,
      // meals, and ingredients — is written atomically via d.batch(). A sequential
      // set of awaits could leave a half-built day behind if any insert failed
      // mid-loop, and the duplicate-date guard would then block recreating it.
      const mealStatements = actions.flatMap((action) => {
        // Materializing against an empty day only ever produces appends.
        if (action.kind !== 'append') return [];
        const mealId = uuidv7();
        // Every copied meal starts unlogged, even with default ingredients (R12).
        const mealInsert = d.insert(meals).values({
          id: mealId,
          dailyMealLogId: id,
          name: action.name,
          origin: 'template',
          logged: false,
          createdAt: ts,
          updatedAt: ts,
        });
        const ingredientInserts = action.ingredients.map((ing) =>
          copyPlanIngredient(ing, mealId, ts),
        );
        if (ingredientInserts.length === 0) return [mealInsert];
        return [mealInsert, d.insert(ingredients).values(ingredientInserts)];
      });

      await d.batch([
        d.insert(dailyMealLogs).values({
          id,
          userId,
          date: data.date,
          targetCalories: data.targetCalories,
          targetFat: data.targetFat,
          targetCarbs: data.targetCarbs,
          targetProtein: data.targetProtein,
          // Days derive coverage from their copied meals; mealCountTarget is kept
          // coherent (plan meal count, or 0 for empty) for legacy display.
          mealCountTarget: actions.length,
          createdAt: ts,
          updatedAt: ts,
        }),
        ...mealStatements,
      ]);

      // Reload so the returned day reflects the copied meals and ingredients.
      const created = await this.getById(userId, id);
      return created!;
    },

    async updateTargets(userId, dayId, targets: DayTargets) {
      const ts = now();
      await d
        .update(dailyMealLogs)
        .set({ ...targets, updatedAt: ts })
        .where(and(eq(dailyMealLogs.id, dayId), eq(dailyMealLogs.userId, userId)));
      const updated = await this.getById(userId, dayId);
      return updated!;
    },

    async setProgressPhoto(userId, dayId, pose: ProgressPose, key) {
      const day = await this.getById(userId, dayId);
      if (!day) return null;

      const { releasedKey } = setDayPhoto(
        {
          frontPhotoKey: day.frontPhotoKey,
          sidePhotoKey: day.sidePhotoKey,
          backPhotoKey: day.backPhotoKey,
        },
        pose,
        key,
      );

      const column = POSE_TO_KEY[pose];
      const set: Partial<typeof dailyMealLogs.$inferInsert> = { updatedAt: now() };
      set[column] = key;
      await d
        .update(dailyMealLogs)
        .set(set)
        .where(and(eq(dailyMealLogs.id, dayId), eq(dailyMealLogs.userId, userId)));

      const updated = await this.getById(userId, dayId);
      return { day: updated!, releasedKey };
    },

    async getMostRecentWeightDate(userId) {
      const rows = await d
        .select({ date: dailyMealLogs.date })
        .from(dailyMealLogs)
        .where(and(eq(dailyMealLogs.userId, userId), isNotNull(dailyMealLogs.weightLbs)))
        .orderBy(desc(dailyMealLogs.date))
        .limit(1);
      return rows[0]?.date ?? null;
    },

    async delete(userId, dayId) {
      const rows = await d
        .select({ id: dailyMealLogs.id, userId: dailyMealLogs.userId })
        .from(dailyMealLogs)
        .where(eq(dailyMealLogs.id, dayId));
      if (!rows[0] || rows[0].userId !== userId) return;
      await d.delete(dailyMealLogs).where(eq(dailyMealLogs.id, dayId));
    },
  };
}
