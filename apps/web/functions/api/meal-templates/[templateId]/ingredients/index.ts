import { createMealTemplateRepository } from '@leanlog/data-d1';
import { UpsertTemplateIngredientSchema } from '@leanlog/data-access';
import type { Env } from '../../../_env';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { templateId } = context.params as { templateId: string };
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = UpsertTemplateIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createMealTemplateRepository(context.env.DB);
  const ingredient = await repo.upsertIngredient(userId, templateId, parsed.data);
  if (!ingredient) {
    return new Response('Template not found or not owned by user', { status: 404 });
  }
  return Response.json(ingredient);
};
