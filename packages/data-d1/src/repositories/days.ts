import { and, desc, eq, inArray, isNotNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { dailyMealLogs, meals, ingredients } from '../schema';
import { createMealTemplateRepository } from './mealTemplates';
import type {
  DayRepository,
  CreateDailyMealLog,
  DayTargets,
  MealTemplateIngredient,
} from '@leanlog/data-access';

// Snapshot a template's default ingredient into a fresh meal ingredient row.
// A new id is minted so the copy is independent of the template (R14).
function copyTemplateIngredient(
  ing: MealTemplateIngredient,
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

      const dayIds = dayRows.map((r) => r.id);
      const mealRows = await d.select().from(meals).where(inArray(meals.dailyMealLogId, dayIds));

      const mealIds = mealRows.map((r) => r.id);
      const ingredientRows =
        mealIds.length > 0
          ? await d.select().from(ingredients).where(inArray(ingredients.mealId, mealIds))
          : [];

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
      const ingredientRows =
        mealRows.length > 0
          ? await d
              .select()
              .from(ingredients)
              .where(
                inArray(
                  ingredients.mealId,
                  mealRows.map((m) => m.id),
                ),
              )
          : [];

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

      // Copy-on-create: snapshot the user's current templates into day-specific
      // meals. Done here (server-side) so later template edits can never touch a
      // day that already exists (R11–R14). Zero-template users get an empty,
      // ad-hoc day (R33).
      const templateRepo = createMealTemplateRepository(db);
      await templateRepo.ensureSeeded(userId);
      const templates = await templateRepo.listByUser(userId);

      // Build every copied meal + ingredient insert up front so the whole day —
      // day row, meals, and ingredients — is written atomically via d.batch().
      // A sequential set of awaits could leave a half-built day behind if any
      // insert failed mid-loop, and the duplicate-date guard would then block
      // recreating it.
      const mealStatements = templates.flatMap((template) => {
        const mealId = uuidv7();
        // Every copied meal starts unlogged, even with default ingredients (R12).
        const mealInsert = d.insert(meals).values({
          id: mealId,
          dailyMealLogId: id,
          name: template.name,
          origin: 'template',
          logged: false,
          createdAt: ts,
          updatedAt: ts,
        });
        if (template.ingredients.length === 0) return [mealInsert];
        return [
          mealInsert,
          d
            .insert(ingredients)
            .values(template.ingredients.map((ing) => copyTemplateIngredient(ing, mealId, ts))),
        ];
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
          // Template-backed days derive coverage from copied meals; mealCountTarget
          // is kept coherent (copied count, or 0 for ad-hoc days) for legacy display.
          mealCountTarget: templates.length,
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
