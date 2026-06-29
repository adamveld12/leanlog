import type { Env } from '../_env';
import { putProgressImage, progressContentType, MAX_PROGRESS_IMAGE_BYTES } from './_storage';

// POST /api/progress-photos/upload
//
// Accepts a single already-optimized JPEG (the client downscales to ~1600px and
// re-encodes at ~0.8 quality before upload) and stores it under a fresh private
// key scoped to the authenticated user (`progress/<userId>/<uuid>.jpg`). Pinning
// the key to a day's pose slot is a separate step, so an orphaned upload is
// harmless. The `_middleware` Clerk guard has already populated `userId`.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;

  const contentType = context.request.headers.get('Content-Type') ?? '';
  if (!contentType.startsWith('image/jpeg')) {
    return new Response('Expected image/jpeg body', { status: 415 });
  }

  const bytes = await context.request.arrayBuffer();
  if (bytes.byteLength === 0) {
    return new Response('Empty body', { status: 400 });
  }
  if (bytes.byteLength > MAX_PROGRESS_IMAGE_BYTES) {
    return new Response('Image too large', { status: 413 });
  }

  const key = await putProgressImage(context.env.IMAGES, userId, bytes);
  return Response.json({ key, contentType: progressContentType() }, { status: 201 });
};
