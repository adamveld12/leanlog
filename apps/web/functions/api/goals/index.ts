import { createGoalsRepository } from '@leanlog/data-d1';
import {
  CreateGoalSchema,
  GoalOverlapError,
  TooManyFutureGoalsError,
  GoalDateError,
} from '@leanlog/data-access';
import type { Env } from '../_env';
import { localDateFromRequest } from '../_dayGuard';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const repo = createGoalsRepository(context.env.DB);
  // Make sure the background maintenance goal exists before listing (R6).
  await repo.ensureBackground(userId);
  const goals = await repo.listByUser(userId);
  return Response.json({ goals });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = CreateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createGoalsRepository(context.env.DB);
  const today = localDateFromRequest(context.request);
  try {
    const goal = await repo.create(userId, parsed.data, today);
    return Response.json(goal, { status: 201 });
  } catch (err) {
    if (err instanceof GoalOverlapError) {
      // The UI uses conflictingGoalId to offer the trim flow (R28).
      return Response.json(
        { error: 'overlap', conflictingGoalId: err.conflictingGoalId },
        { status: 409 },
      );
    }
    if (err instanceof TooManyFutureGoalsError) {
      return Response.json({ error: 'too_many_future' }, { status: 409 });
    }
    if (err instanceof GoalDateError) {
      return new Response(err.message, { status: 400 });
    }
    throw err;
  }
};
