import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { Env } from './_env';

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getIssuerUrl(publishableKey: string): string {
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '');
  const domain = atob(encoded).replace(/\$$/, '');
  return `https://${domain}`;
}

function getJWKS(issuerUrl: string) {
  let jwks = jwksCache.get(issuerUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuerUrl}/.well-known/jwks.json`));
    jwksCache.set(issuerUrl, jwks);
  }
  return jwks;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const issuerUrl = getIssuerUrl(context.env.VITE_CLERK_PUBLISHABLE_KEY);

  try {
    const { payload } = await jwtVerify(token, getJWKS(issuerUrl), {
      issuer: issuerUrl,
    });
    (context.data as Record<string, unknown>).userId = payload.sub;
    return context.next();
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
};
