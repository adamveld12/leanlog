import { createMealRepository } from '@leanlog/data-d1';
import { AddExtraSchema } from '@leanlog/data-access';
import type { Env } from '../../../_env';
import { pastDayGuard } from '../../../_dayGuard';

// Finds the day's singleton 'extra' bucket meal (creating it on first use) and
// inserts the new item into it (#64). Editing/deleting an existing extra
// reuses the standard PUT/DELETE .../meals/:mealId/ingredients/:id routes
// once the client knows the bucket's id from this response.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = AddExtraSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  // Extras follow the same past-day guard as meals (R11/R22).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

  const repo = createMealRepository(context.env.DB);
  const meal = await repo.addExtra(userId, dayId, parsed.data);
  if (!meal) {
    return new Response('Day not found or not owned by user', { status: 404 });
  }
  return Response.json(meal, { status: 201 });
};
