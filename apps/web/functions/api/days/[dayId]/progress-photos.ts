import { createDayRepository } from '@leanlog/data-d1';
import { SetDayProgressPhotoSchema, isOwnedProgressPhotoKey } from '@leanlog/data-access';
import type { Env } from '../../_env';
import { pastDayGuard } from '../../_dayGuard';
import { deleteProgressImage } from '../../progress-photos/_storage';

// PATCH /api/days/:dayId/progress-photos
//
// Pins (or, with key=null, clears) one pose's photo for a day (#69). Capture is
// current-day-only and past days are locked (R4/R17), enforced by the shared
// timezone guard. A non-null key must be well-formed AND owned by this user (R8)
// so a user can never pin another user's object onto their day. Replacing or
// clearing a slot releases the previous R2 object for best-effort cleanup (R18).
export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId } = context.params as { dayId: string };

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = SetDayProgressPhotoSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  if (parsed.data.key !== null && !isOwnedProgressPhotoKey(parsed.data.key, userId)) {
    return new Response('Invalid photo key', { status: 400 });
  }

  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;

  const repo = createDayRepository(context.env.DB);
  const result = await repo.setProgressPhoto(userId, dayId, parsed.data.pose, parsed.data.key);
  if (!result) return new Response('Not found', { status: 404 });

  if (result.releasedKey) {
    await deleteProgressImage(context.env.IMAGES, result.releasedKey);
  }
  return Response.json(result.day);
};
