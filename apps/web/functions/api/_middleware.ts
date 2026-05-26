import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './_env';

const JWKS = createRemoteJWKSet(
  new URL('https://new-wildcat-39.clerk.accounts.dev/.well-known/jwks.json'),
);

export const onRequest: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: 'https://new-wildcat-39.clerk.accounts.dev',
    });
    (context.data as Record<string, unknown>).userId = payload.sub;
    return context.next();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
};
