import { createMealRepository } from '@leanlog/data-d1';
import { z } from 'zod';
import type { Env } from '../../../../_env';

const RenameMealSchema = z.object({
  name: z.string().min(1),
});

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { mealId } = context.params as { mealId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = RenameMealSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createMealRepository(context.env.DB);
  try {
    const meal = await repo.rename(userId, mealId, parsed.data.name);
    return Response.json(meal);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      return new Response('Not found', { status: 404 });
    }
    throw err;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { mealId } = context.params as { mealId: string };
  const repo = createMealRepository(context.env.DB);
  await repo.delete(userId, mealId);
  return new Response(null, { status: 204 });
};
