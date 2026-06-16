import { defineConfig } from 'vitest/config';

// Default unit-test run (used by `pnpm test` / pre-push). Excludes the live model
// harness (`*.evals.test.ts`) so the default suite never triggers model calls.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.evals.test.ts'],
  },
});
