import { createDayRepository, createProfileRepository } from '@leanlog/data-d1';
import { DayTargetsSchema } from '@leanlog/data-access';
import type { Env } from '../../_env';
import { pastDayGuard } from '../../_dayGuard';

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
  // Past days are read-only (R21/R22).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;
  const repo = createDayRepository(context.env.DB);
  const updated = await repo.updateTargets(userId, dayId, parsed.data);
  if (!updated) return new Response('Not found', { status: 404 });

  if (parsed.data.weightLbs !== undefined) {
    const latestDate = await repo.getMostRecentWeightDate(userId);
    if (updated.date >= latestDate!) {
      const profileRepo = createProfileRepository(context.env.DB);
      await profileRepo.update(userId, { weightLbs: Math.round(parsed.data.weightLbs) });
    }
  }
  return Response.json(updated);
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };
  // Intentionally NOT past-day guarded: deleting a whole day (e.g. one created
  // by mistake) is allowed even for past dates. The read-only rules (R21/R22)
  // cover editing a day's contents, not removing the day itself.
  const repo = createDayRepository(context.env.DB);
  await repo.delete(userId, dayId);
  return new Response(null, { status: 204 });
};
