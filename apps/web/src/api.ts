import type {
  DailyMealLog,
  Meal,
  Ingredient,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
} from '@leanlog/data-access';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(`API ${status}: ${message}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function apiFetch<T>(path: string, opts: RequestInit & { token: string }): Promise<T> {
  const { token, ...fetchOpts } = opts;
  const res = await fetch(path, {
    ...fetchOpts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(fetchOpts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, text);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  days: {
    list: (token: string) =>
      apiFetch<{ days: DailyMealLog[] }>('/api/days', { token, method: 'GET' }),
    create: (token: string, data: CreateDailyMealLog) =>
      apiFetch<DailyMealLog>('/api/days', { token, method: 'POST', body: JSON.stringify(data) }),
    get: (token: string, dayId: string) =>
      apiFetch<DailyMealLog>(`/api/days/${dayId}`, { token, method: 'GET' }),
    updateTargets: (token: string, dayId: string, targets: DayTargets) =>
      apiFetch<DailyMealLog>(`/api/days/${dayId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify(targets),
      }),
    delete: (token: string, dayId: string) =>
      apiFetch<void>(`/api/days/${dayId}`, { token, method: 'DELETE' }),
  },
  meals: {
    create: (token: string, dayId: string, name: string) =>
      apiFetch<Meal>(`/api/days/${dayId}/meals`, {
        token,
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    rename: (token: string, dayId: string, mealId: string, name: string) =>
      apiFetch<Meal>(`/api/days/${dayId}/meals/${mealId}`, {
        token,
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    delete: (token: string, dayId: string, mealId: string) =>
      apiFetch<void>(`/api/days/${dayId}/meals/${mealId}`, { token, method: 'DELETE' }),
  },
  ingredients: {
    upsert: (token: string, dayId: string, mealId: string, data: UpsertIngredient) =>
      apiFetch<Ingredient>(`/api/days/${dayId}/meals/${mealId}/ingredients`, {
        token,
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (token: string, dayId: string, mealId: string, ingredientId: string) =>
      apiFetch<void>(`/api/days/${dayId}/meals/${mealId}/ingredients/${ingredientId}`, {
        token,
        method: 'DELETE',
      }),
  },
  profile: {
    get: (token: string) => apiFetch<UserProfile>('/api/profile', { token, method: 'GET' }),
    update: (token: string, data: UpdateProfile) =>
      apiFetch<UserProfile>('/api/profile', { token, method: 'PUT', body: JSON.stringify(data) }),
  },
};
