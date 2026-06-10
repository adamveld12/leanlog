import { createIngredientRepository, createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  AddIngredientFromDatabaseSchema,
  scaleNutritionDatabaseIngredient,
  uuidv7,
} from '@leanlog/data-access';
import type { Env } from '../../../../../_env';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { mealId } = context.params as { mealId: string };

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

  const { databaseIngredientId, measuredAmount } = parsed.data;

  const nutritionRepo = createNutritionDatabaseRepository(context.env.DB);
  const source = await nutritionRepo.getById(databaseIngredientId);
  if (!source) {
    return new Response('Ingredient not found', { status: 404 });
  }

  const snapshot = scaleNutritionDatabaseIngredient(source, measuredAmount);

  const ingredientRepo = createIngredientRepository(context.env.DB);
  const ingredient = await ingredientRepo.upsert(userId, mealId, {
    id: uuidv7(),
    mealId,
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
    return new Response('Meal not found or not owned by user', { status: 404 });
  }

  return Response.json(ingredient);
};
