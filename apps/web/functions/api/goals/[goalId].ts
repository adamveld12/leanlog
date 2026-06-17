import { createGoalsRepository } from '@leanlog/data-d1';
import {
  UpdateGoalSchema,
  GoalOverlapError,
  GoalDateError,
  GoalNotEditableError,
  GoalNotDeletableError,
} from '@leanlog/data-access';
import type { Env } from '../_env';
import { localDateFromRequest } from '../_dayGuard';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { goalId } = context.params as { goalId: string };
  const repo = createGoalsRepository(context.env.DB);
  const goal = await repo.getById(userId, goalId);
  if (!goal) return new Response('Not found', { status: 404 });
  return Response.json(goal);
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { goalId } = context.params as { goalId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = UpdateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createGoalsRepository(context.env.DB);
  const today = localDateFromRequest(context.request);
  try {
    const updated = await repo.update(userId, goalId, parsed.data, today);
    return Response.json(updated);
  } catch (err) {
    if (err instanceof GoalOverlapError) {
      return Response.json(
        { error: 'overlap', conflictingGoalId: err.conflictingGoalId },
        { status: 409 },
      );
    }
    if (err instanceof GoalNotEditableError) {
      return new Response(err.message, { status: 409 });
    }
    if (err instanceof GoalDateError) {
      return new Response(err.message, { status: 400 });
    }
    throw err;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { goalId } = context.params as { goalId: string };
  const repo = createGoalsRepository(context.env.DB);
  const today = localDateFromRequest(context.request);
  try {
    await repo.delete(userId, goalId, today);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof GoalNotDeletableError) {
      return new Response(err.message, { status: 409 });
    }
    throw err;
  }
};
