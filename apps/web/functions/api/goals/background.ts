import { createGoalsRepository } from '@leanlog/data-d1';
import { UpdateBackgroundGoalSchema } from '@leanlog/data-access';
import type { Env } from '../_env';

// Configure the background maintenance goal's calorie basis + body composition
// (#63 R19/R21). This is the one editable surface on the otherwise read-only
// background goal, so it gets its own route rather than the [goalId] PATCH. A
// static path takes precedence over the [goalId] dynamic route in Pages Functions.
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = UpdateBackgroundGoalSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createGoalsRepository(context.env.DB);
  const goal = await repo.updateBackground(userId, parsed.data);
  return Response.json(goal);
};
