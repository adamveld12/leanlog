import { createProfileRepository } from '@leanlog/data-d1';
import { SetProgressBaselineSchema } from '@leanlog/data-access';
import type { Env } from '../_env';

// PATCH /api/progress-photos/baseline
//
// Re-picks (or, with date=null, resets to earliest) the baseline anchoring a
// pose's latest-vs-baseline comparison (#69, R15). This is the sole mutable
// progress-photo control after a day closes, so it is intentionally NOT
// day-guarded — it touches the user's profile, not a past day's photo.
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = SetProgressBaselineSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  const repo = createProfileRepository(context.env.DB);
  const updated = await repo.setProgressBaseline(userId, parsed.data.pose, parsed.data.date);
  return Response.json(updated);
};
