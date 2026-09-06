import { createPlanRepository } from '@leanlog/data-d1';
import { z } from 'zod';
import type { Env } from '../../_env';
import { pastDayGuard } from '../../_dayGuard';

const ApplyPlanSchema = z
  .object({
    planId: z.string().min(1),
  })
  .strict();

// Applies a plan to a day (R18-R27): fills empty/unlogged meal matches, skips
// everything else, and appends unmatched plan meals — atomically, unlogged.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = ApplyPlanSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  // Applying to a past day is blocked by the existing date guard (R18).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

  const repo = createPlanRepository(context.env.DB);
  const result = await repo.applyToDay(userId, dayId, parsed.data.planId);
  if (!result) return new Response('Day or plan not found', { status: 404 });

  return Response.json(result);
};
