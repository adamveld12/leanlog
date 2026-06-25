import { afterEach, describe, expect, it, vi } from 'vitest';
import { USDA_SYSTEM_USER_ID } from '@leanlog/data-access';
import { getUserDisplayNames } from './_clerk';
import type { Env } from './_env';

// The display resolver attributes seeded USDA rows to "USDA" without ever calling
// Clerk for the sentinel owner id (#72).

const envWithClerk = { CLERK_SECRET_KEY: 'sk_test' } as unknown as Env;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('getUserDisplayNames USDA sentinel', () => {
  it('resolves the USDA sentinel to "USDA" without hitting Clerk', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const names = await getUserDisplayNames(envWithClerk, [USDA_SYSTEM_USER_ID]);
    expect(names.get(USDA_SYSTEM_USER_ID)).toBe('USDA');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('only looks up real user ids, still attributing the sentinel locally', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'user_1',
          first_name: 'Adam',
          last_name: null,
          primary_email_address_id: null,
          email_addresses: [],
        }),
        { status: 200 },
      ),
    );
    const names = await getUserDisplayNames(envWithClerk, [USDA_SYSTEM_USER_ID, 'user_1']);
    expect(names.get(USDA_SYSTEM_USER_ID)).toBe('USDA');
    expect(names.get('user_1')).toBe('Adam');
    // Exactly one Clerk call — for the real user, not the sentinel.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toContain('/users/user_1');
  });

  it('attributes the sentinel even when no Clerk key is configured', async () => {
    const names = await getUserDisplayNames({} as Env, [USDA_SYSTEM_USER_ID, 'user_2']);
    expect(names.get(USDA_SYSTEM_USER_ID)).toBe('USDA');
    expect(names.get('user_2')).toBe('LeanLog user');
  });
});
