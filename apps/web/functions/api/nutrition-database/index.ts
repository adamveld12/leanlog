import { createNutritionDatabaseRepository } from '@leanlog/data-d1';
import {
  CreateNutritionDatabaseIngredientSchema,
  caloriesFromMacros,
} from '@leanlog/data-access';
import type { Env } from '../_env';
import { getUserDisplayNames } from '../_clerk';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return Response.json({ results: [] });
  }

  const repo = createNutritionDatabaseRepository(context.env.DB);
  const rows = await repo.search(q);

  const userIds = rows.map((r) => r.addedByUserId);
  const names = await getUserDisplayNames(context.env, userIds);

  const results = rows.map((r) => ({
    ...r,
    addedByName: names.get(r.addedByUserId) ?? 'LeanLog user',
    calories: caloriesFromMacros({ fat: r.fat, carbs: r.carbs, protein: r.protein, fiber: r.fiber }),
  }));

  return Response.json({ results });
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

  const repo = createNutritionDatabaseRepository(context.env.DB);
  const created = await repo.create(userId, parsed.data);
  return Response.json(created);
};
