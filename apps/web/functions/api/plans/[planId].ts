import { createPlanRepository } from '@leanlog/data-d1';
import { RenamePlanSchema, DuplicatePlanNameError } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { planId } = context.params as { planId: string };
  const repo = createPlanRepository(context.env.DB);
  const plan = await repo.getById(userId, planId);
  if (!plan) return new Response('Not found', { status: 404 });
  return Response.json(plan);
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { planId } = context.params as { planId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = RenamePlanSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createPlanRepository(context.env.DB);
  try {
    const plan = await repo.rename(userId, planId, parsed.data.name);
    return Response.json(plan);
  } catch (err) {
    if (err instanceof DuplicatePlanNameError) {
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
  const { planId } = context.params as { planId: string };
  const repo = createPlanRepository(context.env.DB);
  await repo.delete(userId, planId);
  return new Response(null, { status: 204 });
};
