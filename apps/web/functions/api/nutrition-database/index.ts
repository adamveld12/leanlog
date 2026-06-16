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
  // The dedicated Nutrition Facts Database page browses the whole catalog without
  // a search query (#49). The in-meal tab does not pass browse, so its existing
  // "empty query returns just the total" behavior is unchanged.
  const browse = url.searchParams.get('browse') === 'true';
  const limit = Number(url.searchParams.get('limit')) || 50;
  const offset = Number(url.searchParams.get('offset')) || 0;
  const repo = createNutritionDatabaseRepository(context.env.DB);
  const total = await repo.count();

  let rows;
  if (q.length >= 2) {
    rows = await repo.search(q);
  } else if (browse) {
    rows = await repo.listAll(limit, offset);
  } else {
    return Response.json({ results: [], total });
  }

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
