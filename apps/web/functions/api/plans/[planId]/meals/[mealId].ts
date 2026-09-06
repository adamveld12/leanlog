import { createPlanRepository } from '@leanlog/data-d1';
import { RenamePlanMealSchema } from '@leanlog/data-access';
import type { Env } from '../../../_env';

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { mealId } = context.params as { planId: string; mealId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = RenamePlanMealSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createPlanRepository(context.env.DB);
  const meal = await repo.renameMeal(userId, mealId, parsed.data.name);
  if (!meal) return new Response('Not found', { status: 404 });
  return Response.json(meal);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { mealId } = context.params as { planId: string; mealId: string };
  const repo = createPlanRepository(context.env.DB);
  await repo.removeMeal(userId, mealId);
  return new Response(null, { status: 204 });
};
