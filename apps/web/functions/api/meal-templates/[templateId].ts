import { createMealTemplateRepository } from '@leanlog/data-d1';
import { RenameMealTemplateSchema, DuplicateTemplateNameError } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { templateId } = context.params as { templateId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = RenameMealTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createMealTemplateRepository(context.env.DB);
  try {
    const template = await repo.rename(userId, templateId, parsed.data.name);
    return Response.json(template);
  } catch (err) {
    if (err instanceof DuplicateTemplateNameError) {
      return new Response(err.message, { status: 409 });
    }
    if (err instanceof Error && err.message.includes('not found')) {
      return new Response('Not found', { status: 404 });
    }
    throw err;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { templateId } = context.params as { templateId: string };
  const repo = createMealTemplateRepository(context.env.DB);
  await repo.delete(userId, templateId);
  return new Response(null, { status: 204 });
};
