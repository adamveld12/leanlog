import { createDayRepository } from '@leanlog/data-d1';
import type { Env } from './_env';

// The client asserts its local calendar date so the server can enforce the
// today/future/past boundary in the user's timezone (issue #41). Falls back to
// UTC when the header is missing or malformed.
export function localDateFromRequest(request: Request): string {
  const header = request.headers.get('X-Leanlog-Local-Date');
  if (header && /^\d{4}-\d{2}-\d{2}$/.test(header)) return header;
  return new Date().toISOString().slice(0, 10);
}

export function isPastDate(date: string, request: Request): boolean {
  return date < localDateFromRequest(request);
}

// Guards a mutation on a day-scoped resource. Returns a Response to short-circuit
// the handler (404 if the day is missing, 409 if it is in the past and therefore
// read-only — R21/R22), or null when the mutation may proceed.
export async function pastDayGuard(
  env: Env,
  userId: string,
  dayId: string,
  request: Request,
): Promise<Response | null> {
  const repo = createDayRepository(env.DB);
  const day = await repo.getById(userId, dayId);
  if (!day) return new Response('Not found', { status: 404 });
  if (isPastDate(day.date, request)) {
    return new Response('Past days are read-only', { status: 409 });
  }
  return null;
}
