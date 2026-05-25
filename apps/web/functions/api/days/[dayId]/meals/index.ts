import { createMealRepository } from '@leanlog/data-d1';
import { z } from 'zod';
import type { Env } from '../../../_env';

const CreateMealSchema = z.object({
  name: z.string().min(1),
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
  const repo = createMealRepository(context.env.DB);
  const meal = await repo.create(userId, dayId, parsed.data.name);
  return Response.json(meal, { status: 201 });
};
