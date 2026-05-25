import { createDayRepository } from '@leanlog/data-d1';
import { CreateDailyMealLogSchema } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const repo = createDayRepository(context.env.DB);
  const days = await repo.listByUser(userId);
  return Response.json({ days });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = CreateDailyMealLogSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createDayRepository(context.env.DB);
  try {
    const day = await repo.create(userId, parsed.data);
    return Response.json(day, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return new Response('A log for this date already exists', { status: 409 });
    }
    throw err;
  }
};
