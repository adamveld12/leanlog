import { createMealTemplateRepository, createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  AddIngredientFromDatabaseSchema,
  scaleLabelToIngredient,
  uuidv7,
  type AddLabelToMealInput,
} from '@leanlog/data-access';
import type { Env } from '../../../_env';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { templateId } = context.params as { templateId: string };

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = AddIngredientFromDatabaseSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  const { databaseIngredientId, mode, amount } = parsed.data;

  const nutritionRepo = createNutritionDatabaseRepository(context.env.DB);
  const source = await nutritionRepo.getById(databaseIngredientId);
  if (!source) {
    return new Response('Ingredient not found', { status: 404 });
  }

  // amount is guaranteed present for weight/servings by the schema refine.
  const scaling: AddLabelToMealInput =
    mode === 'package' ? { mode } : { mode, amount: amount as number };
  const snapshot = scaleLabelToIngredient(source, scaling);

  const repo = createMealTemplateRepository(context.env.DB);
  const ingredient = await repo.upsertIngredient(userId, templateId, {
    id: uuidv7(),
    templateId,
    name: snapshot.name,
    weight: snapshot.weight,
    fat: snapshot.fat,
    carbs: snapshot.carbs,
    protein: snapshot.protein,
    saturatedFat: snapshot.saturatedFat ?? 0,
    fiber: snapshot.fiber ?? 0,
    unsaturatedFat: snapshot.unsaturatedFat,
    monounsaturatedFat: snapshot.monounsaturatedFat,
    polyunsaturatedFat: snapshot.polyunsaturatedFat,
    transFat: snapshot.transFat,
    sugar: snapshot.sugar,
    micronutrients: snapshot.micronutrients,
    sourceDatabaseIngredientId: snapshot.sourceDatabaseIngredientId,
  });

  if (!ingredient) {
    return new Response('Template not found or not owned by user', { status: 404 });
  }

  return Response.json(ingredient);
};
