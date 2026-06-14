import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadApi() {
  vi.resetModules();
  vi.doUnmock('../api');
  return import('../api');
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeOkJson(data: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

describe('api.nutritionDatabase', () => {
  it('search sends GET with encoded query and returns results', async () => {
    const { api } = await loadApi();
    const mockResults = [{ id: 'db-1', name: 'Chicken', addedByName: 'Alice', calories: 200 }];
    const fetchMock = vi.fn(() => makeOkJson({ results: mockResults, total: 7 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.nutritionDatabase.search('tok', 'Chick en');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/nutrition-database?q=Chick%20en');
    // apiFetch always passes method; GET is the default but still present
    expect((opts as Record<string, unknown>).method).toBe('GET');
    expect(result).toEqual({ results: mockResults, total: 7 });
  });

  it('create sends POST with JSON body to /api/nutrition-database', async () => {
    const { api } = await loadApi();
    const created = { id: 'db-2', name: 'Oats' };
    const fetchMock = vi.fn(() => makeOkJson(created));
    vi.stubGlobal('fetch', fetchMock);

    const data = {
      name: 'Oats',
      servingAmount: 100,
      servingSizeUnit: 'gram' as const,
      servingsPerPackage: 12,
      creationSource: 'manual' as const,
      fat: 7,
      carbs: 66,
      protein: 17,
      calories: 397,
    };
    const result = await api.nutritionDatabase.create('tok', data);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/nutrition-database');
    expect((opts as Record<string, unknown>).method).toBe('POST');
    expect(JSON.parse((opts as Record<string, unknown>).body as string)).toMatchObject(data);
    expect(result).toEqual(created);
  });
});

describe('api.ingredients.addFromDatabase', () => {
  it('sends POST to from-database route and returns Ingredient', async () => {
    const { api } = await loadApi();
    const ingredient = { id: 'ing-1', mealId: 'meal-1', name: 'Chicken' };
    const fetchMock = vi.fn(() => makeOkJson(ingredient));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.ingredients.addFromDatabase('tok', 'day-1', 'meal-1', {
      databaseIngredientId: 'db-1',
      mode: 'weight',
      amount: 150,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, opts] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/days/day-1/meals/meal-1/ingredients/from-database');
    expect((opts as Record<string, unknown>).method).toBe('POST');
    const body = JSON.parse((opts as Record<string, unknown>).body as string) as Record<
      string,
      unknown
    >;
    expect(body.databaseIngredientId).toBe('db-1');
    expect(body.mode).toBe('weight');
    expect(body.amount).toBe(150);
    expect(result).toEqual(ingredient);
  });
});

describe('apiFetch error handling', () => {
  it('reports successful API responses that are not JSON as invalid payloads', async () => {
    const { api, ApiError } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('<!doctype html><html></html>', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
          }),
        ),
      ),
    );

    await expect(api.days.list('token')).rejects.toMatchObject({
      name: 'ApiError',
      kind: 'invalid-payload',
      path: '/api/days',
      status: 200,
      message: 'API returned invalid payload (Not JSON) for /api/days',
    });
    await expect(api.days.list('token')).rejects.toBeInstanceOf(ApiError);
  });

  it('reports malformed JSON payloads without leaking parser internals', async () => {
    const { api } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('{bad json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    );

    await expect(api.days.list('token')).rejects.toMatchObject({
      kind: 'invalid-payload',
      path: '/api/days',
      status: 200,
      message: 'API returned invalid payload (Malformed JSON) for /api/days',
    });
  });

  it('includes the route in HTTP error messages', async () => {
    const { api } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response('Not found', {
            status: 404,
            headers: { 'Content-Type': 'text/plain' },
          }),
        ),
      ),
    );

    await expect(api.days.list('token')).rejects.toMatchObject({
      kind: 'http',
      path: '/api/days',
      status: 404,
      message: 'API 404 for /api/days: Not found',
    });
  });

  it('reports network failures with API context', async () => {
    const { api } = await loadApi();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Failed to fetch'))),
    );

    await expect(api.days.list('token')).rejects.toMatchObject({
      kind: 'network',
      path: '/api/days',
      status: 0,
      message: 'API request failed for /api/days: Failed to fetch',
    });
  });
});
