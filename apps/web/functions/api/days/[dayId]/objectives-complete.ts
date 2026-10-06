import { createDayRepository } from '@leanlog/data-d1';
import { dayObjectives } from '@leanlog/data-access';
import type { Env } from '../../_env';
import { pastDayGuard } from '../../_dayGuard';

// The client triggers, the server decides (#37 R25–R27): the timestamp is only
// written when the stored day genuinely has every objective complete, so a stale
// or forged request can't stamp a day. Past days are guarded like every other
// day-scoped write, which keeps the stamp honest — it can only be set on the
// day it happened.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };

  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

  const repo = createDayRepository(context.env.DB);
  const day = await repo.getById(userId, dayId);
  if (!day) return new Response('Not found', { status: 404 });

  // Idempotent: already stamped, or not complete yet → return the day as-is.
  if (day.objectivesCompletedAt || !dayObjectives(day).allComplete) {
    return Response.json(day);
  }

  const marked = await repo.markObjectivesComplete(userId, dayId, new Date().toISOString());
  if (!marked) return new Response('Not found', { status: 404 });
  return Response.json(marked);
};
