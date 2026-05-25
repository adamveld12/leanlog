import { createDayRepository } from '@leanlog/data-d1';
import { DayTargetsSchema } from '@leanlog/data-access';
import type { Env } from '../../_env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };
  const repo = createDayRepository(context.env.DB);
  const day = await repo.getById(userId, dayId);
  if (!day) return new Response('Not found', { status: 404 });
  return Response.json(day);
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = DayTargetsSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createDayRepository(context.env.DB);
  const updated = await repo.updateTargets(userId, dayId, parsed.data);
  if (!updated) return new Response('Not found', { status: 404 });
  return Response.json(updated);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };
  const repo = createDayRepository(context.env.DB);
  await repo.delete(userId, dayId);
  return new Response(null, { status: 204 });
};
