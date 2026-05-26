import { createIngredientRepository } from '@leanlog/data-d1';
import type { Env } from '../../../../../_env';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { ingredientId } = context.params as { ingredientId: string };
  const repo = createIngredientRepository(context.env.DB);
  await repo.delete(userId, ingredientId);
  return new Response(null, { status: 204 });
};
