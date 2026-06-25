import type { Env } from '../_env';
import { putImage, imageContentType, MAX_IMAGE_BYTES } from './_images';

// POST /api/nutrition-database/images
//
// Accepts a single already-optimized JPEG (the client downscales to ~1600px and
// re-encodes at ~0.8 quality before upload, #54), stores it content-addressed in
// R2, and returns the object key. Storing the key on an entry is a separate step
// (create payload or the photos PATCH), so an orphaned upload is harmless and
// gets swept when no entry references it.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const contentType = context.request.headers.get('Content-Type') ?? '';
  if (!contentType.startsWith('image/jpeg')) {
    return new Response('Expected image/jpeg body', { status: 415 });
  }

  const bytes = await context.request.arrayBuffer();
  if (bytes.byteLength === 0) {
    return new Response('Empty body', { status: 400 });
  }
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    return new Response('Image too large', { status: 413 });
  }

  const key = await putImage(context.env.IMAGES, bytes);
  return Response.json({ key, contentType: imageContentType() }, { status: 201 });
};
