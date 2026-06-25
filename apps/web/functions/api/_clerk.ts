import { USDA_SYSTEM_USER_ID } from '@leanlog/data-access';
import type { Env } from './_env';

// Seeded USDA rows are owned by a sentinel id, not a real Clerk user. They always
// attribute to "USDA" and must never trigger a Clerk lookup (#72).
const USDA_DISPLAY_NAME = 'USDA';

interface ClerkEmailAddress {
  id: string;
  email_address: string;
}

interface ClerkUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email_address_id: string | null;
  email_addresses: ClerkEmailAddress[];
}

export function displayNameFromClerkUser(user: ClerkUser): string {
  const first = user.first_name?.trim() ?? '';
  const last = user.last_name?.trim() ?? '';

  if (first && last) return `${first} ${last}`;
  if (first) return first;

  const primary = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
  if (primary) {
    const localPart = primary.email_address.split('@')[0];
    if (localPart) return localPart;
  }

  return 'LeanLog user';
}

export async function getUserDisplayNames(
  env: Env,
  userIds: string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds)];
  const results = new Map<string, string>();

  // The USDA sentinel resolves locally to "USDA" — never fetched from Clerk.
  for (const id of unique) {
    if (id === USDA_SYSTEM_USER_ID) results.set(id, USDA_DISPLAY_NAME);
  }
  const toLookup = unique.filter((id) => id !== USDA_SYSTEM_USER_ID);

  if (!env.CLERK_SECRET_KEY || toLookup.length === 0) {
    for (const id of toLookup) results.set(id, 'LeanLog user');
    return results;
  }

  const settled = await Promise.allSettled(
    toLookup.map(async (userId) => {
      const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
      });
      if (!res.ok) return { userId, name: 'LeanLog user' };
      const user = (await res.json()) as ClerkUser;
      return { userId, name: displayNameFromClerkUser(user) };
    }),
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.set(result.value.userId, result.value.name);
    }
  }

  // Ensure every requested ID has an entry even if a promise rejected
  for (const id of unique) {
    if (!results.has(id)) results.set(id, 'LeanLog user');
  }

  return results;
}
