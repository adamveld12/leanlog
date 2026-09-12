import { createMealRepository, createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  AddIngredientFromDatabaseSchema,
  scaleLabelToIngredient,
  uuidv7,
  type AddLabelToMealInput,
} from '@leanlog/data-access';
import type { Env } from '../../../_env';
import { pastDayGuard } from '../../../_dayGuard';

// Looks a saved label up in the shared nutrition database, scales it to the
// amount consumed, and drops the snapshot into the day's Extras bucket —
// creating that bucket on first use, exactly like POST /extras (#93).
// Returns the whole bucket meal so a client that has never seen it learns its
// id, which it needs for subsequent edits and deletes.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };

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
  // Extras follow the same past-day guard as meals (#64 R11, #93 R12).
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

  const mealRepo = createMealRepository(context.env.DB);
  const meal = await mealRepo.addExtraFromDatabase(userId, dayId, { id: uuidv7(), ...snapshot });
  if (!meal) {
    return new Response('Day not found or not owned by user', { status: 404 });
  }

  return Response.json(meal, { status: 201 });
};
