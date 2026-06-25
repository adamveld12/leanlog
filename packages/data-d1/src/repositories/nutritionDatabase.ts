import { count, desc, eq, like, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { nutritionDatabaseIngredients } from '../schema';
import {
  parseMicronutrientsJson,
  NutritionLabelOwnershipError,
  resolvePhotoUpdate,
  entryPhotoKeys,
} from '@leanlog/data-access';
import type {
  NutritionDatabaseRepository,
  NutritionDatabaseIngredient,
  CreateNutritionDatabaseIngredient,
  UpdateNutritionDatabaseIngredient,
  DeleteNutritionResult,
  PhotoUpdatePatch,
  Micronutrient,
} from '@leanlog/data-access';

function serializeMicronutrients(
  micronutrients: Micronutrient[] | null | undefined,
): string | null {
  if (micronutrients == null) return null;
  return JSON.stringify(micronutrients);
}

function rowToDomain(
  row: typeof nutritionDatabaseIngredients.$inferSelect,
): NutritionDatabaseIngredient {
  return {
    id: row.id,
    name: row.name,
    servingAmount: row.servingAmount,
    servingSizeUnit: row.servingSizeUnit,
    servingSizeDisplayText: row.servingSizeDisplayText ?? null,
    servingsPerPackage: row.servingsPerPackage,
    addedByUserId: row.addedByUserId,
    creationSource: row.creationSource,
    fat: row.fat,
    carbs: row.carbs,
    protein: row.protein,
    saturatedFat: row.saturatedFat ?? null,
    unsaturatedFat: row.unsaturatedFat ?? null,
    monounsaturatedFat: row.monounsaturatedFat ?? null,
    polyunsaturatedFat: row.polyunsaturatedFat ?? null,
    transFat: row.transFat ?? null,
    fiber: row.fiber ?? null,
    sugar: row.sugar ?? null,
    addedSugars: row.addedSugars ?? null,
    calories: row.calories,
    sugarAlcohol: row.sugarAlcohol ?? null,
    allulose: row.allulose ?? null,
    alcohol: row.alcohol ?? null,
    micronutrients: parseMicronutrientsJson(row.micronutrientsJson),
    productPhotoKey: row.productPhotoKey ?? null,
    labelPhotoKey: row.labelPhotoKey ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createNutritionDatabaseRepository(db: D1Database): NutritionDatabaseRepository {
  const d = drizzle(db);
  const now = () => new Date().toISOString();

  // Photo objects are content-addressed, so identical bytes from two entries
  // (or even both slots of one entry) dedupe to a single R2 object key. Before
  // deleting an object we must confirm no entry still references it (R9
  // refcount). Both callers mutate the row first (update/delete) and then call
  // this, so a plain query against the live DB is the source of truth: a key is
  // orphaned iff no surviving row references it in either slot.
  async function findOrphanedKeys(candidates: string[]): Promise<string[]> {
    const unique = [...new Set(candidates)];
    if (unique.length === 0) return [];
    const orphaned: string[] = [];
    for (const key of unique) {
      const rows = await d
        .select({ id: nutritionDatabaseIngredients.id })
        .from(nutritionDatabaseIngredients)
        .where(
          or(
            eq(nutritionDatabaseIngredients.productPhotoKey, key),
            eq(nutritionDatabaseIngredients.labelPhotoKey, key),
          ),
        );
      if (rows.length === 0) orphaned.push(key);
    }
    return orphaned;
  }

  return {
    async create(
      userId: string,
      data: CreateNutritionDatabaseIngredient,
    ): Promise<NutritionDatabaseIngredient> {
      const id = uuidv7();
      const ts = now();
      await d.insert(nutritionDatabaseIngredients).values({
        id,
        name: data.name,
        servingAmount: data.servingAmount,
        servingSizeUnit: data.servingSizeUnit,
        servingSizeDisplayText: data.servingSizeDisplayText ?? null,
        servingsPerPackage: data.servingsPerPackage,
        addedByUserId: userId,
        creationSource: data.creationSource,
        fat: data.fat,
        carbs: data.carbs,
        protein: data.protein,
        saturatedFat: data.saturatedFat ?? null,
        unsaturatedFat: data.unsaturatedFat ?? null,
        monounsaturatedFat: data.monounsaturatedFat ?? null,
        polyunsaturatedFat: data.polyunsaturatedFat ?? null,
        transFat: data.transFat ?? null,
        fiber: data.fiber ?? null,
        sugar: data.sugar ?? null,
        addedSugars: data.addedSugars ?? null,
        calories: data.calories,
        sugarAlcohol: data.sugarAlcohol ?? null,
        allulose: data.allulose ?? null,
        alcohol: data.alcohol ?? null,
        micronutrientsJson: serializeMicronutrients(data.micronutrients ?? null),
        productPhotoKey: data.productPhotoKey ?? null,
        labelPhotoKey: data.labelPhotoKey ?? null,
        createdAt: ts,
        updatedAt: ts,
      });
      const rows = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      return rowToDomain(rows[0]!);
    },

    async search(query: string, limit = 25): Promise<NutritionDatabaseIngredient[]> {
      const cap = Math.min(limit, 25);
      const rows = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(like(nutritionDatabaseIngredients.name, `%${query}%`))
        .orderBy(nutritionDatabaseIngredients.createdAt)
        .limit(cap);
      return rows.map(rowToDomain);
    },

    async listAll(limit = 50, offset = 0): Promise<NutritionDatabaseIngredient[]> {
      const cap = Math.min(Math.max(limit, 1), 50);
      const rows = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .orderBy(desc(nutritionDatabaseIngredients.updatedAt))
        .limit(cap)
        .offset(Math.max(offset, 0));
      return rows.map(rowToDomain);
    },

    async getById(id: string): Promise<NutritionDatabaseIngredient | null> {
      const rows = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      return rows[0] ? rowToDomain(rows[0]) : null;
    },

    async update(
      userId: string,
      id: string,
      data: UpdateNutritionDatabaseIngredient,
    ): Promise<NutritionDatabaseIngredient | null> {
      const existing = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      if (!existing[0]) return null;
      // Ownership gate: the catalog is shared, so only the adder may edit (#49).
      if (existing[0].addedByUserId !== userId) throw new NutritionLabelOwnershipError();

      // creationSource and addedByUserId are immutable (omitted from the update
      // schema); everything else is replaced from the reviewed form.
      await d
        .update(nutritionDatabaseIngredients)
        .set({
          name: data.name,
          servingAmount: data.servingAmount,
          servingSizeUnit: data.servingSizeUnit,
          servingSizeDisplayText: data.servingSizeDisplayText ?? null,
          servingsPerPackage: data.servingsPerPackage,
          fat: data.fat,
          carbs: data.carbs,
          protein: data.protein,
          saturatedFat: data.saturatedFat ?? null,
          unsaturatedFat: data.unsaturatedFat ?? null,
          monounsaturatedFat: data.monounsaturatedFat ?? null,
          polyunsaturatedFat: data.polyunsaturatedFat ?? null,
          transFat: data.transFat ?? null,
          fiber: data.fiber ?? null,
          sugar: data.sugar ?? null,
          addedSugars: data.addedSugars ?? null,
          calories: data.calories,
          sugarAlcohol: data.sugarAlcohol ?? null,
          allulose: data.allulose ?? null,
          alcohol: data.alcohol ?? null,
          micronutrientsJson: serializeMicronutrients(data.micronutrients ?? null),
          updatedAt: now(),
        })
        .where(eq(nutritionDatabaseIngredients.id, id));

      const rows = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      return rowToDomain(rows[0]!);
    },

    async setPhotos(
      userId: string,
      id: string,
      patch: PhotoUpdatePatch,
    ): Promise<{ label: NutritionDatabaseIngredient; orphanedKeys: string[] } | null> {
      const existing = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      if (!existing[0]) return null;
      // Photos are part of the shared entry, so only the creator may change them (R13).
      if (existing[0].addedByUserId !== userId) throw new NutritionLabelOwnershipError();

      const { next, releasedKeys } = resolvePhotoUpdate(
        {
          productPhotoKey: existing[0].productPhotoKey ?? null,
          labelPhotoKey: existing[0].labelPhotoKey ?? null,
        },
        patch,
      );

      await d
        .update(nutritionDatabaseIngredients)
        .set({
          productPhotoKey: next.productPhotoKey,
          labelPhotoKey: next.labelPhotoKey,
          updatedAt: now(),
        })
        .where(eq(nutritionDatabaseIngredients.id, id));

      // Of the keys this entry dropped, only delete the ones no other entry uses.
      const orphanedKeys = await findOrphanedKeys(releasedKeys);

      const rows = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      return { label: rowToDomain(rows[0]!), orphanedKeys };
    },

    async delete(userId: string, id: string): Promise<DeleteNutritionResult> {
      const existing = await d
        .select()
        .from(nutritionDatabaseIngredients)
        .where(eq(nutritionDatabaseIngredients.id, id));
      if (!existing[0]) return { status: 'not_found' };
      if (existing[0].addedByUserId !== userId) throw new NutritionLabelOwnershipError();

      const heldKeys = entryPhotoKeys({
        productPhotoKey: existing[0].productPhotoKey ?? null,
        labelPhotoKey: existing[0].labelPhotoKey ?? null,
      });
      await d.delete(nutritionDatabaseIngredients).where(eq(nutritionDatabaseIngredients.id, id));
      // After the row is gone, any held key not referenced elsewhere is orphaned.
      const orphanedKeys = await findOrphanedKeys(heldKeys);
      return { status: 'deleted', orphanedKeys };
    },

    async count(): Promise<number> {
      const rows = await d.select({ value: count() }).from(nutritionDatabaseIngredients);
      return rows[0]?.value ?? 0;
    },
  };
}
