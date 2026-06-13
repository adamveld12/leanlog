import { createMealRepository } from '@leanlog/data-d1';
import { TemplateMealNotDeletableError, EmptyMealNotLoggableError } from '@leanlog/data-access';
import { z } from 'zod';
import type { Env } from '../../../../_env';
import { pastDayGuard } from '../../../../_dayGuard';

// A meal PATCH either renames the meal or sets its logged state (the Log action).
const PatchMealSchema = z
  .object({
    name: z.string().min(1).optional(),
    logged: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.logged !== undefined, {
    message: 'Provide name or logged',
  });

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId, mealId } = context.params as { dayId: string; mealId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = PatchMealSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  // Meals on past days are read-only (R22).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

  const repo = createMealRepository(context.env.DB);
  try {
    let meal;
    if (parsed.data.name !== undefined) {
      meal = await repo.rename(userId, mealId, parsed.data.name);
    }
    if (parsed.data.logged !== undefined) {
      meal = await repo.setLogged(userId, mealId, parsed.data.logged);
    }
    return Response.json(meal);
  } catch (err) {
    if (err instanceof EmptyMealNotLoggableError) {
      return new Response(err.message, { status: 409 });
    }
    if (err instanceof Error && err.message.includes('not found')) {
      return new Response('Not found', { status: 404 });
    }
    throw err;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId, mealId } = context.params as { dayId: string; mealId: string };
  // Meals on past days are read-only (R22).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

  const repo = createMealRepository(context.env.DB);
  try {
    await repo.delete(userId, mealId);
    return new Response(null, { status: 204 });
  } catch (err) {
    // Copied template meals cannot be deleted (R19).
    if (err instanceof TemplateMealNotDeletableError) {
      return new Response(err.message, { status: 403 });
    }
    throw err;
  }
};
