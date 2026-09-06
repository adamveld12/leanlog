import { createPlanRepository } from '@leanlog/data-d1';
import { CreatePlanSchema, DuplicatePlanNameError } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const repo = createPlanRepository(context.env.DB);
  const plans = await repo.listByUser(userId);
  return Response.json({ plans });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = CreatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createPlanRepository(context.env.DB);
  try {
    const plan = await repo.create(userId, parsed.data);
    return Response.json(plan, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicatePlanNameError) {
      return new Response(err.message, { status: 409 });
    }
    throw err;
  }
};
