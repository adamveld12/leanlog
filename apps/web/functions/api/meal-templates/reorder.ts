import { createMealTemplateRepository } from '@leanlog/data-d1';
import { ReorderMealTemplatesSchema } from '@leanlog/data-access';
import type { Env } from '../_env';

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }
  const parsed = ReorderMealTemplatesSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }
  const repo = createMealTemplateRepository(context.env.DB);
  const templates = await repo.reorder(userId, parsed.data.orderedIds);
  return Response.json({ templates });
};
