import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { mealTemplates, mealTemplateIngredients, userProfiles } from '../schema';
import { estimateCalories, DEFAULT_MEAL_TEMPLATE_NAMES } from '@leanlog/data-access';
import {
  DuplicateTemplateNameError,
  type MealTemplateRepository,
  type MealTemplate,
  type MealTemplateIngredient,
  type CreateMealTemplate,
  type UpsertTemplateIngredient,
  type Micronutrient,
} from '@leanlog/data-access';

function serializeMicronutrients(m: Micronutrient[] | null | undefined): string | null {
  return m == null ? null : JSON.stringify(m);
}

function deserializeMicronutrients(json: string | null | undefined): Micronutrient[] | null {
  return json == null ? null : (JSON.parse(json) as Micronutrient[]);
}

function ingredientRowToDomain(
  row: typeof mealTemplateIngredients.$inferSelect,
): MealTemplateIngredient {
  return {
    id: row.id,
    templateId: row.templateId,
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
    micronutrients: deserializeMicronutrients(row.micronutrientsJson),
    sourceDatabaseIngredientId: row.sourceDatabaseIngredientId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createMealTemplateRepository(db: D1Database): MealTemplateRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  async function ownsTemplate(userId: string, templateId: string): Promise<boolean> {
    const rows = await d
      .select({ userId: mealTemplates.userId })
      .from(mealTemplates)
      .where(eq(mealTemplates.id, templateId));
    return rows[0]?.userId === userId;
  }

  async function assertNameAvailable(
    userId: string,
    name: string,
    excludeTemplateId?: string,
  ): Promise<void> {
    const rows = await d
      .select({ id: mealTemplates.id, name: mealTemplates.name })
      .from(mealTemplates)
      .where(eq(mealTemplates.userId, userId));
    const taken = rows.some(
      (r) =>
        r.id !== excludeTemplateId && r.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (taken) throw new DuplicateTemplateNameError(name);
  }

  async function loadTemplate(templateId: string): Promise<MealTemplate> {
    const row = (await d.select().from(mealTemplates).where(eq(mealTemplates.id, templateId)))[0]!;
    const ingredientRows = await d
      .select()
      .from(mealTemplateIngredients)
      .where(eq(mealTemplateIngredients.templateId, templateId));
    return { ...row, ingredients: ingredientRows.map(ingredientRowToDomain) };
  }

  const repo: MealTemplateRepository = {
    async ensureSeeded(userId) {
      const profile = (
        await d
          .select({ seededAt: userProfiles.mealTemplatesSeededAt })
          .from(userProfiles)
          .where(eq(userProfiles.clerkUserId, userId))
      )[0];
      // Only seed once. A null flag means we have never seeded; any non-null
      // value (even with zero templates left) means the user has taken over.
      if (profile?.seededAt != null) return;

      const ts = now();
      await d.insert(mealTemplates).values(
        DEFAULT_MEAL_TEMPLATE_NAMES.map((name, position) => ({
          id: uuidv7(),
          userId,
          name,
          position,
          createdAt: ts,
          updatedAt: ts,
        })),
      );
      await d
        .update(userProfiles)
        .set({ mealTemplatesSeededAt: ts })
        .where(eq(userProfiles.clerkUserId, userId));
    },

    async listByUser(userId) {
      const templateRows = await d
        .select()
        .from(mealTemplates)
        .where(eq(mealTemplates.userId, userId))
        .orderBy(mealTemplates.position);
      if (templateRows.length === 0) return [];

      const ids = templateRows.map((t) => t.id);
      const ingredientRows = await d
        .select()
        .from(mealTemplateIngredients)
        .where(inArray(mealTemplateIngredients.templateId, ids));

      return templateRows.map((t) => ({
        ...t,
        ingredients: ingredientRows.filter((i) => i.templateId === t.id).map(ingredientRowToDomain),
      }));
    },

    async create(userId, data: CreateMealTemplate) {
      await assertNameAvailable(userId, data.name);
      const id = uuidv7();
      const ts = now();
      const existing = await d
        .select({ position: mealTemplates.position })
        .from(mealTemplates)
        .where(eq(mealTemplates.userId, userId));
      const nextPosition = existing.reduce((max, r) => Math.max(max, r.position + 1), 0);
      await d.insert(mealTemplates).values({
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
        ingredients: [],
        createdAt: ts,
        updatedAt: ts,
      };
    },

    async rename(userId, templateId, name) {
      if (!(await ownsTemplate(userId, templateId))) {
        throw new Error(`Template ${templateId} not found or access denied`);
      }
      await assertNameAvailable(userId, name, templateId);
      await d
        .update(mealTemplates)
        .set({ name, updatedAt: now() })
        .where(eq(mealTemplates.id, templateId));
      return loadTemplate(templateId);
    },

    async delete(userId, templateId) {
      if (!(await ownsTemplate(userId, templateId))) return;
      await d.delete(mealTemplates).where(eq(mealTemplates.id, templateId));
    },

    async reorder(userId, orderedIds) {
      const ts = now();
      // Only reposition templates the user actually owns; ignore unknown ids.
      const owned = await d
        .select({ id: mealTemplates.id })
        .from(mealTemplates)
        .where(eq(mealTemplates.userId, userId));
      const ownedIds = new Set(owned.map((r) => r.id));
      let position = 0;
      for (const id of orderedIds) {
        if (!ownedIds.has(id)) continue;
        await d
          .update(mealTemplates)
          .set({ position, updatedAt: ts })
          .where(eq(mealTemplates.id, id));
        position += 1;
      }
      return repo.listByUser(userId);
    },

    async upsertIngredient(userId, templateId, data: UpsertTemplateIngredient) {
      if (!(await ownsTemplate(userId, templateId))) return null;
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
        templateId,
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
        .insert(mealTemplateIngredients)
        .values({ ...values, createdAt: ts, updatedAt: ts })
        .onConflictDoUpdate({
          target: mealTemplateIngredients.id,
          set: { ...values, updatedAt: ts },
        });

      const rows = await d
        .select()
        .from(mealTemplateIngredients)
        .where(eq(mealTemplateIngredients.id, data.id));
      return ingredientRowToDomain(rows[0]!);
    },

    async deleteIngredient(userId, ingredientId) {
      const rows = await d
        .select({ userId: mealTemplates.userId })
        .from(mealTemplateIngredients)
        .innerJoin(mealTemplates, eq(mealTemplateIngredients.templateId, mealTemplates.id))
        .where(eq(mealTemplateIngredients.id, ingredientId));
      if (rows[0]?.userId !== userId) return;
      await d.delete(mealTemplateIngredients).where(eq(mealTemplateIngredients.id, ingredientId));
    },
  };

  return repo;
}
