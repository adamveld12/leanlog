import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadApi() {
  vi.resetModules();
  vi.doUnmock('../api');
  return import('../api');
}

afterEach(() => {
  vi.unstubAllGlobals();
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
