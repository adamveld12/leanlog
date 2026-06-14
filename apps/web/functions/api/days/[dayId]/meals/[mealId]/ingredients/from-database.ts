import { createIngredientRepository, createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  AddIngredientFromDatabaseSchema,
  scaleLabelToIngredient,
  uuidv7,
  type AddLabelToMealInput,
} from '@leanlog/data-access';
import type { Env } from '../../../../../_env';
import { pastDayGuard } from '../../../../../_dayGuard';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId, mealId } = context.params as { dayId: string; mealId: string };

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
  // Ingredient edits on past days are blocked (R22).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

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

  const ingredientRepo = createIngredientRepository(context.env.DB);
  const ingredient = await ingredientRepo.upsert(userId, mealId, {
    id: uuidv7(),
    mealId,
    name: snapshot.name,
    weight: snapshot.weight,
    // Forward the label's scaled explicit calories so the ingredient keeps the
    // printed value (calorieSource: 'explicit') instead of re-estimating.
    calories: snapshot.calories,
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
    sugarAlcohol: snapshot.sugarAlcohol,
    allulose: snapshot.allulose,
    alcohol: snapshot.alcohol,
    micronutrients: snapshot.micronutrients,
    sourceDatabaseIngredientId: snapshot.sourceDatabaseIngredientId,
  });

  if (!ingredient) {
    return new Response('Meal not found or not owned by user', { status: 404 });
  }

  return Response.json(ingredient);
};
