import { createIngredientRepository } from '@leanlog/data-d1';
import type { Env } from '../../../../../_env';
import { pastDayGuard } from '../../../../../_dayGuard';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { dayId, ingredientId } = context.params as { dayId: string; ingredientId: string };
  // Ingredient edits on past days are blocked (R22).
  const blocked = await pastDayGuard(context.env, userId, dayId, context.request);
  if (blocked) return blocked;
  const repo = createIngredientRepository(context.env.DB);
  await repo.delete(userId, ingredientId);
  return new Response(null, { status: 204 });
};
