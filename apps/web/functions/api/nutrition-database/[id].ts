import { createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  UpdateNutritionDatabaseIngredientSchema,
  validateNutritionLabel,
  NutritionLabelOwnershipError,
} from '@leanlog/data-access';
import type { Env } from '../_env';
import { getUserDisplayNames } from '../_clerk';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { id } = context.params as { id: string };
  const repo = createNutritionDatabaseRepository(context.env.DB);
  const label = await repo.getById(id);
  if (!label) return new Response('Not found', { status: 404 });

  const names = await getUserDisplayNames(context.env, [label.addedByUserId]);
  return Response.json({
    ...label,
    addedByName: names.get(label.addedByUserId) ?? 'LeanLog user',
  });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { id } = context.params as { id: string };

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = UpdateNutritionDatabaseIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  // Block impossible labels (sub-values exceeding their totals) before persisting (R5).
  const contradictions = validateNutritionLabel(parsed.data);
  if (contradictions.length > 0) {
    return new Response(JSON.stringify({ errors: contradictions }), { status: 400 });
  }

  const repo = createNutritionDatabaseRepository(context.env.DB);
  try {
    const updated = await repo.update(userId, id, parsed.data);
    if (!updated) return new Response('Not found', { status: 404 });
    return Response.json(updated);
  } catch (err) {
    if (err instanceof NutritionLabelOwnershipError) {
      return new Response(err.message, { status: 403 });
    }
    throw err;
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;
  const { id } = context.params as { id: string };
  const repo = createNutritionDatabaseRepository(context.env.DB);
  try {
    const result = await repo.delete(userId, id);
    if (result === 'not_found') return new Response('Not found', { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof NutritionLabelOwnershipError) {
      return new Response(err.message, { status: 403 });
    }
    throw err;
  }
};
