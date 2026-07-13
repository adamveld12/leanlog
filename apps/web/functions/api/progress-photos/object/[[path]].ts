import { isOwnedProgressPhotoKey, isValidProgressPhotoKey } from '@leanlog/data-access';
import type { Env } from '../../_env';
import { progressContentType } from '../_storage';

// GET /api/progress-photos/object/<userId>/<uuid>.jpg
//
// The authenticated photo proxy (R8/R9). It lives under /api so the Clerk
// `_middleware` guard runs first — an unauthenticated request never reaches here
// (401). The requested object key is reconstructed from the path and served only
// when it is well-formed AND owned by the authenticated user; any other key
// (malformed, or another user's prefix) returns 404 so existence isn't leaked.
// Objects are immutable per UUID, so we cache — but `private` only, never a
// shared/public cache, since the bytes are access-controlled.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const path = (context.params as { path?: string | string[] }).path;
  const rest = Array.isArray(path) ? path.join('/') : (path ?? '');
  const objectKey = `progress/${rest}`;

  if (!isValidProgressPhotoKey(objectKey) || !isOwnedProgressPhotoKey(objectKey, userId)) {
    return new Response('Not found', { status: 404 });
  }

  const object = await context.env.IMAGES.get(objectKey);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const etag = object.httpEtag;
  if (context.request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? progressContentType(),
      'Cache-Control': 'private, max-age=31536000, immutable',
      ETag: etag,
    },
  });
};
