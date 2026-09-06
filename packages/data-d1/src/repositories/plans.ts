import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import {
  plans,
  planMeals,
  planMealIngredients,
  goals,
  dailyMealLogs,
  meals,
  ingredients,
} from '../schema';
import {
  estimateCalories,
  parseMicronutrientsJson,
  planMaterialization,
} from '@leanlog/data-access';
import {
  DuplicatePlanNameError,
  type PlanRepository,
  type Plan,
  type PlanMeal,
  type PlanMealIngredient,
  type CreatePlan,
  type CreatePlanMeal,
  type UpsertPlanIngredient,
  type Micronutrient,
  type MaterializeDayMeal,
} from '@leanlog/data-access';

function serializeMicronutrients(m: Micronutrient[] | null | undefined): string | null {
  return m == null ? null : JSON.stringify(m);
}

// d.batch() requires a non-empty tuple; statements are built dynamically in
// a loop, so we cast a plain array to that tuple shape at the call site,
// matching the pattern used in days.test.ts.
type BatchStatement = Parameters<ReturnType<typeof drizzle>['batch']>[0][number];
function asBatch(statements: BatchStatement[]): [BatchStatement, ...BatchStatement[]] {
  return statements as [BatchStatement, ...BatchStatement[]];
}

function ingredientRowToDomain(row: typeof planMealIngredients.$inferSelect): PlanMealIngredient {
  return {
    id: row.id,
    planMealId: row.planMealId,
    name: row.name,
    weight: row.weight,
    calories: row.calories,
    fat: row.fat,
    saturatedFat: row.saturatedFat,
    carbs: row.carbs,
    fiber: row.fiber,
    protein: row.protein,
    unsaturatedFat: row.unsaturatedFat ?? null,
    monounsaturatedFat: row.monounsaturatedFat ?? null,
    polyunsaturatedFat: row.polyunsaturatedFat ?? null,
    transFat: row.transFat ?? null,
    sugar: row.sugar ?? null,
    sugarAlcohol: row.sugarAlcohol ?? null,
    allulose: row.allulose ?? null,
    alcohol: row.alcohol ?? null,
    calorieSource: row.calorieSource,
    estimatedCalories: row.estimatedCalories,
    micronutrients: parseMicronutrientsJson(row.micronutrientsJson),
    sourceDatabaseIngredientId: row.sourceDatabaseIngredientId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Snapshot a plan meal's ingredient into a fresh day ingredient row. A new id
// is minted so the copy is independent of the plan (R24) — used by both day
// creation (goal's default plan) and explicit plan application.
export function copyPlanIngredient(
  ing: PlanMealIngredient,
  mealId: string,
  ts: string,
): typeof ingredients.$inferInsert {
  return {
    id: uuidv7(),
    mealId,
    name: ing.name,
    weight: ing.weight,
    calories: ing.calories,
    fat: ing.fat,
    saturatedFat: ing.saturatedFat,
    carbs: ing.carbs,
    fiber: ing.fiber,
    protein: ing.protein,
    unsaturatedFat: ing.unsaturatedFat ?? null,
    monounsaturatedFat: ing.monounsaturatedFat ?? null,
    polyunsaturatedFat: ing.polyunsaturatedFat ?? null,
    transFat: ing.transFat ?? null,
    sugar: ing.sugar ?? null,
    sugarAlcohol: ing.sugarAlcohol ?? null,
    allulose: ing.allulose ?? null,
    alcohol: ing.alcohol ?? null,
    calorieSource: ing.calorieSource,
    estimatedCalories: ing.estimatedCalories,
    micronutrientsJson: ing.micronutrients == null ? null : JSON.stringify(ing.micronutrients),
    sourceDatabaseIngredientId: ing.sourceDatabaseIngredientId ?? null,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function createPlanRepository(db: D1Database): PlanRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  async function ownsPlan(userId: string, planId: string): Promise<boolean> {
    const rows = await d.select({ userId: plans.userId }).from(plans).where(eq(plans.id, planId));
    return rows[0]?.userId === userId;
  }

  async function assertNameAvailable(
    userId: string,
    name: string,
    excludePlanId?: string,
  ): Promise<void> {
    const rows = await d
      .select({ id: plans.id, name: plans.name })
      .from(plans)
      .where(eq(plans.userId, userId));
    const taken = rows.some(
      (r) => r.id !== excludePlanId && r.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (taken) throw new DuplicatePlanNameError(name);
  }

  async function loadPlan(planId: string): Promise<Plan> {
    const row = (await d.select().from(plans).where(eq(plans.id, planId)))[0]!;
    const mealRows = await d
      .select()
      .from(planMeals)
      .where(eq(planMeals.planId, planId))
      .orderBy(planMeals.position);
    const mealIds = mealRows.map((m) => m.id);
    const ingredientRows =
      mealIds.length === 0
        ? []
        : await d
            .select()
            .from(planMealIngredients)
            .where(inArray(planMealIngredients.planMealId, mealIds));
    return {
      ...row,
      meals: mealRows.map((meal) => ({
        ...meal,
        ingredients: ingredientRows
          .filter((i) => i.planMealId === meal.id)
          .map(ingredientRowToDomain),
      })),
    };
  }

  async function loadPlanMeal(planMealId: string): Promise<PlanMeal> {
    const row = (await d.select().from(planMeals).where(eq(planMeals.id, planMealId)))[0]!;
    const ingredientRows = await d
      .select()
      .from(planMealIngredients)
      .where(eq(planMealIngredients.planMealId, planMealId));
    return { ...row, ingredients: ingredientRows.map(ingredientRowToDomain) };
  }

  // Loads a day's meals reduced to what materialization needs (R19-R25), plus
  // enough to reconstruct the full day afterwards.
  async function loadDayMaterializeState(dayId: string) {
    const dayMealRows = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
    const ingredientRows =
      dayMealRows.length === 0
        ? []
        : await d
            .select()
            .from(ingredients)
            .where(
              inArray(
                ingredients.mealId,
                dayMealRows.map((m) => m.id),
              ),
            );
    const countByMeal = new Map<string, number>();
    for (const row of ingredientRows) {
      countByMeal.set(row.mealId, (countByMeal.get(row.mealId) ?? 0) + 1);
    }
    const materializeDayMeals: MaterializeDayMeal[] = dayMealRows.map((m) => ({
      id: m.id,
      name: m.name,
      logged: m.logged,
      ingredientCount: countByMeal.get(m.id) ?? 0,
    }));
    return materializeDayMeals;
  }

  const repo: PlanRepository = {
    async listByUser(userId) {
      const planRows = await d
        .select()
        .from(plans)
        .where(eq(plans.userId, userId))
        .orderBy(plans.position);
      if (planRows.length === 0) return [];

      const mealRows = (
        await d
          .select()
          .from(planMeals)
          .innerJoin(plans, eq(planMeals.planId, plans.id))
          .where(eq(plans.userId, userId))
      ).map((r) => r.plan_meals);

      return planRows.map((p) => ({
        ...p,
        meals: mealRows
          .filter((m) => m.planId === p.id)
          .sort((a, b) => a.position - b.position)
          .map((m) => ({
            id: m.id,
            planId: m.planId,
            name: m.name,
            position: m.position,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
          })),
      }));
    },

    async getById(userId, planId) {
      if (!(await ownsPlan(userId, planId))) return null;
      return loadPlan(planId);
    },

    async create(userId, data: CreatePlan) {
      await assertNameAvailable(userId, data.name);
      const id = uuidv7();
      const ts = now();
      const existing = await d
        .select({ position: plans.position })
        .from(plans)
        .where(eq(plans.userId, userId));
      const nextPosition = existing.reduce((max, r) => Math.max(max, r.position + 1), 0);
      await d.insert(plans).values({
        id,
        userId,
        name: data.name,
        position: nextPosition,
        createdAt: ts,
        updatedAt: ts,
      });
      return {
        id,
        userId,
        name: data.name,
        position: nextPosition,
        meals: [],
        createdAt: ts,
        updatedAt: ts,
      };
    },

    async rename(userId, planId, name) {
      if (!(await ownsPlan(userId, planId))) {
        throw new Error(`Plan ${planId} not found or access denied`);
      }
      await assertNameAvailable(userId, name, planId);
      await d.update(plans).set({ name, updatedAt: now() }).where(eq(plans.id, planId));
      return loadPlan(planId);
    },

    async delete(userId, planId) {
      if (!(await ownsPlan(userId, planId))) return;
      // Clear any goal referencing this plan first (R33) — belt-and-braces
      // alongside the schema's onDelete: 'set null', because D1's FK-action
      // behavior inside a batch isn't something to bet R33 on.
      await d.batch([
        d.update(goals).set({ defaultPlanId: null }).where(eq(goals.defaultPlanId, planId)),
        d.delete(plans).where(eq(plans.id, planId)),
      ]);
    },

    async duplicate(userId, planId) {
      const source = await repo.getById(userId, planId);
      if (!source) return null;
      const ts = now();
      const newPlanId = uuidv7();
      const existing = await d
        .select({ position: plans.position })
        .from(plans)
        .where(eq(plans.userId, userId));
      const nextPosition = existing.reduce((max, r) => Math.max(max, r.position + 1), 0);

      const statements: BatchStatement[] = [
        d.insert(plans).values({
          id: newPlanId,
          userId,
          name: `${source.name} copy`,
          position: nextPosition,
          createdAt: ts,
          updatedAt: ts,
        }),
      ];
      for (const meal of source.meals) {
        const newMealId = uuidv7();
        statements.push(
          d.insert(planMeals).values({
            id: newMealId,
            planId: newPlanId,
            name: meal.name,
            position: meal.position,
            createdAt: ts,
            updatedAt: ts,
          }),
        );
        if (meal.ingredients.length > 0) {
          statements.push(
            d.insert(planMealIngredients).values(
              meal.ingredients.map((ing) => ({
                id: uuidv7(),
                planMealId: newMealId,
                name: ing.name,
                weight: ing.weight,
                calories: ing.calories,
                fat: ing.fat,
                saturatedFat: ing.saturatedFat,
                carbs: ing.carbs,
                fiber: ing.fiber,
                protein: ing.protein,
                unsaturatedFat: ing.unsaturatedFat ?? null,
                monounsaturatedFat: ing.monounsaturatedFat ?? null,
                polyunsaturatedFat: ing.polyunsaturatedFat ?? null,
                transFat: ing.transFat ?? null,
                sugar: ing.sugar ?? null,
                sugarAlcohol: ing.sugarAlcohol ?? null,
                allulose: ing.allulose ?? null,
                alcohol: ing.alcohol ?? null,
                calorieSource: ing.calorieSource,
                estimatedCalories: ing.estimatedCalories,
                micronutrientsJson: serializeMicronutrients(ing.micronutrients),
                sourceDatabaseIngredientId: ing.sourceDatabaseIngredientId ?? null,
                createdAt: ts,
                updatedAt: ts,
              })),
            ),
          );
        }
      }
      await d.batch(asBatch(statements));
      return loadPlan(newPlanId);
    },

    async reorder(userId, orderedIds) {
      const ts = now();
      const owned = await d.select({ id: plans.id }).from(plans).where(eq(plans.userId, userId));
      const ownedIds = new Set(owned.map((r) => r.id));
      let position = 0;
      for (const id of orderedIds) {
        if (!ownedIds.has(id)) continue;
        await d.update(plans).set({ position, updatedAt: ts }).where(eq(plans.id, id));
        position += 1;
      }
      return repo.listByUser(userId);
    },

    async addMeal(userId, planId, data: CreatePlanMeal) {
      if (!(await ownsPlan(userId, planId))) return null;
      const id = uuidv7();
      const ts = now();
      const existing = await d
        .select({ position: planMeals.position })
        .from(planMeals)
        .where(eq(planMeals.planId, planId));
      const nextPosition = existing.reduce((max, r) => Math.max(max, r.position + 1), 0);
      await d.insert(planMeals).values({
        id,
        planId,
        name: data.name,
        position: nextPosition,
        createdAt: ts,
        updatedAt: ts,
      });
      return {
        id,
        planId,
        name: data.name,
        position: nextPosition,
        ingredients: [],
        createdAt: ts,
        updatedAt: ts,
      };
    },

    async renameMeal(userId, planMealId, name) {
      const rows = await d
        .select({ userId: plans.userId })
        .from(planMeals)
        .innerJoin(plans, eq(planMeals.planId, plans.id))
        .where(eq(planMeals.id, planMealId));
      if (rows[0]?.userId !== userId) return null;
      await d.update(planMeals).set({ name, updatedAt: now() }).where(eq(planMeals.id, planMealId));
      return loadPlanMeal(planMealId);
    },

    async removeMeal(userId, planMealId) {
      const rows = await d
        .select({ userId: plans.userId })
        .from(planMeals)
        .innerJoin(plans, eq(planMeals.planId, plans.id))
        .where(eq(planMeals.id, planMealId));
      if (rows[0]?.userId !== userId) return;
      await d.delete(planMeals).where(eq(planMeals.id, planMealId));
    },

    async reorderMeals(userId, planId, orderedIds) {
      if (!(await ownsPlan(userId, planId))) return [];
      const ts = now();
      const owned = await d
        .select({ id: planMeals.id })
        .from(planMeals)
        .where(eq(planMeals.planId, planId));
      const ownedIds = new Set(owned.map((r) => r.id));
      let position = 0;
      for (const id of orderedIds) {
        if (!ownedIds.has(id)) continue;
        await d.update(planMeals).set({ position, updatedAt: ts }).where(eq(planMeals.id, id));
        position += 1;
      }
      const plan = await loadPlan(planId);
      return plan.meals;
    },

    async upsertIngredient(userId, planMealId, data: UpsertPlanIngredient) {
      const rows = await d
        .select({ userId: plans.userId })
        .from(planMeals)
        .innerJoin(plans, eq(planMeals.planId, plans.id))
        .where(eq(planMeals.id, planMealId));
      if (rows[0]?.userId !== userId) return null;

      const ts = now();
      const estimated = estimateCalories({
        fat: data.fat,
        carbs: data.carbs,
        protein: data.protein,
        fiber: data.fiber,
        sugarAlcohol: data.sugarAlcohol,
        allulose: data.allulose,
        alcohol: data.alcohol,
      });
      const explicit = data.calories ?? null;
      const calories = explicit ?? estimated;
      const calorieSource = explicit != null ? ('explicit' as const) : ('estimated' as const);

      const values = {
        id: data.id,
        planMealId,
        name: data.name,
        weight: data.weight,
        calories,
        estimatedCalories: estimated,
        calorieSource,
        fat: data.fat,
        saturatedFat: data.saturatedFat,
        carbs: data.carbs,
        fiber: data.fiber,
        protein: data.protein,
        unsaturatedFat: data.unsaturatedFat ?? null,
        monounsaturatedFat: data.monounsaturatedFat ?? null,
        polyunsaturatedFat: data.polyunsaturatedFat ?? null,
        transFat: data.transFat ?? null,
        sugar: data.sugar ?? null,
        sugarAlcohol: data.sugarAlcohol ?? null,
        allulose: data.allulose ?? null,
        alcohol: data.alcohol ?? null,
        micronutrientsJson: serializeMicronutrients(data.micronutrients ?? null),
        sourceDatabaseIngredientId: data.sourceDatabaseIngredientId ?? null,
      };

      await d
        .insert(planMealIngredients)
        .values({ ...values, createdAt: ts, updatedAt: ts })
        .onConflictDoUpdate({
          target: planMealIngredients.id,
          set: { ...values, updatedAt: ts },
        });

      const inserted = await d
        .select()
        .from(planMealIngredients)
        .where(eq(planMealIngredients.id, data.id));
      return ingredientRowToDomain(inserted[0]!);
    },

    async deleteIngredient(userId, ingredientId) {
      const rows = await d
        .select({ userId: plans.userId })
        .from(planMealIngredients)
        .innerJoin(planMeals, eq(planMealIngredients.planMealId, planMeals.id))
        .innerJoin(plans, eq(planMeals.planId, plans.id))
        .where(eq(planMealIngredients.id, ingredientId));
      if (rows[0]?.userId !== userId) return;
      await d.delete(planMealIngredients).where(eq(planMealIngredients.id, ingredientId));
    },

    async applyToDay(userId, dayId, planId) {
      const dayRows = await d.select().from(dailyMealLogs).where(eq(dailyMealLogs.id, dayId));
      const day = dayRows[0];
      if (!day || day.userId !== userId) return null;

      const plan = await repo.getById(userId, planId);
      if (!plan) return null;

      const dayMeals = await loadDayMaterializeState(dayId);
      const actions = planMaterialization(
        plan.meals.map((m) => ({ name: m.name, ingredients: m.ingredients })),
        dayMeals,
      );

      const ts = now();
      const statements: BatchStatement[] = [];
      let filled = 0;
      let skipped = 0;
      for (const action of actions) {
        if (action.kind === 'skip') {
          skipped += 1;
          continue;
        }
        filled += 1;
        if (action.kind === 'fill') {
          if (action.ingredients.length > 0) {
            statements.push(
              d
                .insert(ingredients)
                .values(
                  action.ingredients.map((ing) => copyPlanIngredient(ing, action.mealId, ts)),
                ),
            );
          }
          continue;
        }
        // append
        const newMealId = uuidv7();
        statements.push(
          d.insert(meals).values({
            id: newMealId,
            dailyMealLogId: dayId,
            name: action.name,
            origin: 'template',
            logged: false,
            createdAt: ts,
            updatedAt: ts,
          }),
        );
        if (action.ingredients.length > 0) {
          statements.push(
            d
              .insert(ingredients)
              .values(action.ingredients.map((ing) => copyPlanIngredient(ing, newMealId, ts))),
          );
        }
      }

      // R25: applying an already-filled plan produces only skips, so there is
      // nothing to write — d.batch requires at least one statement.
      if (statements.length > 0) await d.batch(asBatch(statements));

      const updatedMealRows = await d.select().from(meals).where(eq(meals.dailyMealLogId, dayId));
      const updatedIngredientRows =
        updatedMealRows.length === 0
          ? []
          : await d
              .select()
              .from(ingredients)
              .where(
                inArray(
                  ingredients.mealId,
                  updatedMealRows.map((m) => m.id),
                ),
              );
      const updatedDay = {
        ...day,
        meals: updatedMealRows.map((meal) => ({
          ...meal,
          ingredients: updatedIngredientRows.filter((i) => i.mealId === meal.id),
        })),
      };

      return { day: updatedDay, filled, skipped };
    },
  };

  return repo;
}
