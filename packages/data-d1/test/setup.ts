import { applyD1Migrations, env } from 'cloudflare:test';
import { inject, beforeAll } from 'vitest';
import type { D1Migration } from '@cloudflare/vitest-pool-workers';

declare module 'vitest' {
  interface ProvidedContext {
    D1_MIGRATIONS: D1Migration[];
  }
}

// Apply schema migrations once per test file before any test runs.
beforeAll(async () => {
  await applyD1Migrations(env.DB, inject('D1_MIGRATIONS'));
});
