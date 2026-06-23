import type { Env } from '../../api/_env';
import { isValidImageKey, imageContentType } from '../../api/nutrition-database/_images';

// GET /images/nutrition/:key
//
// Public, unauthenticated read of a nutrition-entry photo (#54). It lives under
// /images (outside the /api Clerk guard) so <img> tags and shared links work
// without a bearer token. Objects are content-addressed and immutable, so we
// cache aggressively. The key is validated to a strict pattern to prevent
// traversal / arbitrary-object reads.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { key } = context.params as { key: string };
  const objectKey = `nutrition/${key}`;
  if (!isValidImageKey(objectKey)) {
    return new Response('Not found', { status: 404 });
  }

  const object = await context.env.IMAGES.get(objectKey);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  // Serve a 304 when the client already holds the (immutable) object.
  const etag = object.httpEtag;
  if (context.request.headers.get('If-None-Match') === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? imageContentType(),
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    },
  });
};
