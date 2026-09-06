import { createPlanRepository } from '@leanlog/data-d1';
import { UpsertPlanIngredientSchema } from '@leanlog/data-access';
import type { Env } from '../../../../../_env';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { mealId } = context.params as { planId: string; mealId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = UpsertPlanIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createPlanRepository(context.env.DB);
  const ingredient = await repo.upsertIngredient(userId, mealId, parsed.data);
  if (!ingredient) {
    return new Response('Plan meal not found or not owned by user', { status: 404 });
  }
  return Response.json(ingredient);
};
