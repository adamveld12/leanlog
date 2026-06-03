import type {
  DailyMealLog,
  Meal,
  Ingredient,
  UserProfile,
  CreateDailyMealLog,
  UpdateProfile,
  UpsertIngredient,
  DayTargets,
  ScanResolution,
} from '@leanlog/data-access';

type ApiErrorKind = 'http' | 'invalid-payload' | 'network';
type ApiPayloadReason = 'Empty body' | 'Malformed JSON' | 'Not JSON';

type ApiErrorOptions = {
  kind: ApiErrorKind;
  path: string;
  method: string;
  status: number;
  detail?: string;
  payloadReason?: ApiPayloadReason;
  contentType?: string;
  responseSnippet?: string;
  cause?: unknown;
};

function buildApiErrorMessage({ kind, path, status, detail, payloadReason }: ApiErrorOptions) {
  if (kind === 'invalid-payload') {
    return `API returned invalid payload (${payloadReason ?? 'Malformed JSON'}) for ${path}`;
  }
  if (kind === 'network') {
    return `API request failed for ${path}: ${detail ?? 'Network unavailable'}`;
  }
  return `API ${status} for ${path}: ${detail ?? 'No response body'}`;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly path: string;
  readonly method: string;
  readonly detail?: string;
  readonly payloadReason?: ApiPayloadReason;
  readonly contentType?: string;
  readonly responseSnippet?: string;

  constructor(options: ApiErrorOptions);
  constructor(status: number, message: string);
  constructor(optionsOrStatus: ApiErrorOptions | number, message?: string) {
    const options: ApiErrorOptions =
      typeof optionsOrStatus === 'number'
        ? {
            kind: 'http',
            path: 'unknown API route',
            method: 'GET',
            status: optionsOrStatus,
            detail: message,
          }
        : optionsOrStatus;

    super(buildApiErrorMessage(options), { cause: options.cause });
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
    this.path = options.path;
    this.method = options.method;
    this.detail = options.detail;
    this.payloadReason = options.payloadReason;
    this.contentType = options.contentType;
    this.responseSnippet = options.responseSnippet;
  }
}

type ApiFetchOptions = RequestInit & { token: string };
type ApiRequestContext = { path: string; method: string };

const JSON_CONTENT_TYPE = /(^|;)\s*application\/([\w.-]+\+)?json\b/i;
const RESPONSE_SNIPPET_LENGTH = 180;

function requestMethod(opts: RequestInit): string {
  return (opts.method ?? 'GET').toUpperCase();
}

function requestHeaders(token: string, fetchOpts: RequestInit): Headers {
  const headers = new Headers(fetchOpts.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (typeof fetchOpts.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

function responseSnippet(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > RESPONSE_SNIPPET_LENGTH
    ? `${trimmed.slice(0, RESPONSE_SNIPPET_LENGTH)}…`
    : trimmed;
}

function responseContentType(res: Response): string {
  return res.headers.get('Content-Type') ?? '';
}

function isJsonResponse(contentType: string): boolean {
  return JSON_CONTENT_TYPE.test(contentType);
}

function httpErrorDetail(text: string, statusText: string): string {
  const snippet = responseSnippet(text);
  if (!snippet) return statusText || 'No response body';
  if (/^<!doctype html\b|^<html\b/i.test(snippet)) return 'HTML response';
  try {
    const parsed = JSON.parse(text) as unknown;
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      if (typeof record.message === 'string') return record.message;
      if (typeof record.error === 'string') return record.error;
    }
  } catch {
    // Plain text error bodies are fine.
  }
  return snippet;
}

async function parseJsonPayload<T>(res: Response, context: ApiRequestContext): Promise<T> {
  const contentType = responseContentType(res);
  const text = await res.text();
  const snippet = responseSnippet(text);

  if (!snippet) {
    throw new ApiError({
      ...context,
      kind: 'invalid-payload',
      status: res.status,
      payloadReason: 'Empty body',
      contentType,
    });
  }

  if (!isJsonResponse(contentType)) {
    throw new ApiError({
      ...context,
      kind: 'invalid-payload',
      status: res.status,
      payloadReason: 'Not JSON',
      contentType,
      responseSnippet: snippet,
    });
  }

  try {
    return JSON.parse(text) as T;
  } catch (cause) {
    throw new ApiError({
      ...context,
      kind: 'invalid-payload',
      status: res.status,
      payloadReason: 'Malformed JSON',
      contentType,
      responseSnippet: snippet,
      cause,
    });
  }
}

async function apiFetch<T>(path: string, opts: ApiFetchOptions): Promise<T> {
  const { token, ...fetchOpts } = opts;
  const context = { path, method: requestMethod(fetchOpts) };
  let res: Response;
  try {
    res = await fetch(path, {
      ...fetchOpts,
      headers: requestHeaders(token, fetchOpts),
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Network unavailable';
    throw new ApiError({ ...context, kind: 'network', status: 0, detail, cause });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError({
      ...context,
      kind: 'http',
      status: res.status,
      detail: httpErrorDetail(text, res.statusText),
      contentType: responseContentType(res),
      responseSnippet: responseSnippet(text),
    });
  }
  if (res.status === 204) return undefined as T;
  return parseJsonPayload<T>(res, context);
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
  scanNutrition: (token: string, data: FormData) =>
    apiFetch<ScanResolution>('/api/scan-nutrition', { token, method: 'POST', body: data }),
};
