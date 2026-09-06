import { createPlanRepository } from '@leanlog/data-d1';
import { ReorderPlanMealsSchema } from '@leanlog/data-access';
import type { Env } from '../../../_env';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { planId } = context.params as { planId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = ReorderPlanMealsSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createPlanRepository(context.env.DB);
  const mealsList = await repo.reorderMeals(userId, planId, parsed.data.orderedIds);
  return Response.json({ meals: mealsList });
};
