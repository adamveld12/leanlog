import { createPlanRepository } from '@leanlog/data-d1';
import type { Env } from '../../_env';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { planId } = context.params as { planId: string };
  const repo = createPlanRepository(context.env.DB);
  const plan = await repo.duplicate(userId, planId);
  if (!plan) return new Response('Not found', { status: 404 });
  return Response.json(plan, { status: 201 });
};
