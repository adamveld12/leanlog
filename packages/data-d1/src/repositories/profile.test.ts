import { describe, test, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { drizzle } from 'drizzle-orm/d1';
import { uuidv7 } from 'uuidv7';
import { createProfileRepository } from './profile';
import { userProfiles } from '../schema';

const ts = () => new Date().toISOString();

describe('profile appMode (#102)', () => {
  test('a brand-new profile starts in simple mode', async () => {
    const repo = createProfileRepository(env.DB);
    const profile = await repo.getOrCreate(`user_${uuidv7()}`);
    expect(profile.appMode).toBe('simple');
  });

  test('a profile row written without app_mode (pre-migration users) reads full mode', async () => {
    const clerkUserId = `user_${uuidv7()}`;
    // Raw insert that omits app_mode, so the column default applies — the same
    // path the migration backfill takes for existing users.
    await env.DB.prepare(
      'INSERT INTO user_profiles (id, clerk_user_id, created_at, updated_at) VALUES (?, ?, ?, ?)',
    )
      .bind(uuidv7(), clerkUserId, ts(), ts())
      .run();

    const profile = await createProfileRepository(env.DB).getOrCreate(clerkUserId);
    expect(profile.appMode).toBe('full');
  });

  test('switching mode persists', async () => {
    const repo = createProfileRepository(env.DB);
    const clerkUserId = `user_${uuidv7()}`;
    await repo.getOrCreate(clerkUserId);

    await repo.update(clerkUserId, { appMode: 'full' });
    expect((await repo.getOrCreate(clerkUserId)).appMode).toBe('full');
  });

  test('a partial update that omits appMode leaves the mode unchanged', async () => {
    const repo = createProfileRepository(env.DB);
    const clerkUserId = `user_${uuidv7()}`;
    const d = drizzle(env.DB);
    await d.insert(userProfiles).values({
      id: uuidv7(),
      clerkUserId,
      appMode: 'full',
      createdAt: ts(),
      updatedAt: ts(),
    });

    const updated = await repo.update(clerkUserId, { heightInches: 70 });
    expect(updated.appMode).toBe('full');
    expect(updated.heightInches).toBe(70);
  });
});
