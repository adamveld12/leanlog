import { createDayRepository, createMealRepository } from '@leanlog/data-d1';
import { z } from 'zod';
import type { Env } from '../../../_env';
import { isPastDate } from '../../../_dayGuard';

const CreateMealSchema = z.object({
  name: z.string(),
});

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = CreateMealSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  const dayRepo = createDayRepository(context.env.DB);
  const day = await dayRepo.getById(userId, dayId);
  if (!day) return new Response('Not found', { status: 404 });
  // Past days are read-only (R22).
  if (isPastDate(day.date, context.request)) {
    return new Response('Past days are read-only', { status: 409 });
  }
  // Ad-hoc meals are only allowed on zero-template days; template-backed days
  // have a fixed meal structure in the first version (R34/R36).
  if (day.meals.some((m) => m.origin === 'template')) {
    return new Response('Cannot add ad-hoc meals to a template-backed day', { status: 409 });
  }

  const repo = createMealRepository(context.env.DB);
  const meal = await repo.create(userId, dayId, parsed.data.name);
  return Response.json(meal, { status: 201 });
};
