import { createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  CreateNutritionDatabaseIngredientSchema,
  validateNutritionLabel,
} from '@leanlog/data-access';
import type { Env } from '../_env';
import { getUserDisplayNames } from '../_clerk';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  const repo = createNutritionDatabaseRepository(context.env.DB);
  const total = await repo.count();
  if (q.length < 2) {
    return Response.json({ results: [], total });
  }

  const rows = await repo.search(q);

  const userIds = rows.map((r) => r.addedByUserId);
  const names = await getUserDisplayNames(context.env, userIds);

  const results = rows.map((r) => ({
    ...r,
    addedByName: names.get(r.addedByUserId) ?? 'LeanLog user',
    calories: r.calories,
  }));

  return Response.json({ results, total });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const userId = (context.data as Record<string, string>).userId;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const parsed = CreateNutritionDatabaseIngredientSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify(parsed.error.flatten()), { status: 400 });
  }

  // Block impossible labels (sub-values exceeding their totals) before persisting (R5).
  const contradictions = validateNutritionLabel(parsed.data);
  if (contradictions.length > 0) {
    return new Response(JSON.stringify({ errors: contradictions }), { status: 400 });
  }

  const repo = createNutritionDatabaseRepository(context.env.DB);
  const created = await repo.create(userId, parsed.data);
  return Response.json(created);
};
