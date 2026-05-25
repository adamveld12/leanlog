import { createProfileRepository } from '@leanlog/data-d1';
import { UpdateProfileSchema } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const repo = createProfileRepository(context.env.DB);
  const profile = await repo.getOrCreate(userId);
  return Response.json(profile);
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createProfileRepository(context.env.DB);
  const updated = await repo.update(userId, parsed.data);
  return Response.json(updated);
};
