import { createMealTemplateRepository } from '@leanlog/data-d1';
import { CreateMealTemplateSchema, DuplicateTemplateNameError } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const repo = createMealTemplateRepository(context.env.DB);
  // First read seeds the default templates for brand-new users (R2/R10).
  await repo.ensureSeeded(userId);
  const templates = await repo.listByUser(userId);
  return Response.json({ templates });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = CreateMealTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createMealTemplateRepository(context.env.DB);
  try {
    const template = await repo.create(userId, parsed.data);
    return Response.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof DuplicateTemplateNameError) {
      return new Response(err.message, { status: 409 });
    }
    throw err;
  }
};
