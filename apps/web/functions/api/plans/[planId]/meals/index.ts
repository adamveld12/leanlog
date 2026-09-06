import { createPlanRepository } from '@leanlog/data-d1';
import { CreatePlanMealSchema } from '@leanlog/data-access';
import type { Env } from '../../../_env';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { planId } = context.params as { planId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = CreatePlanMealSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createPlanRepository(context.env.DB);
  const meal = await repo.addMeal(userId, planId, parsed.data);
  if (!meal) return new Response('Plan not found or not owned by user', { status: 404 });
  return Response.json(meal, { status: 201 });
};
