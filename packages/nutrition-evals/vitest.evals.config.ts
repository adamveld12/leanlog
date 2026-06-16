import { defineConfig } from 'vitest/config';

// The live eval harness only. Run via `pnpm run test:evals`; this is the only path
// that makes real model calls and requires GOOGLE_GENERATIVE_AI_API_KEY.
export default defineConfig({
  test: {
    include: ['**/*.evals.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
