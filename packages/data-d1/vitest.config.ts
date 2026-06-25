import { defineConfig } from 'vitest/config';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers';
import path from 'node:path';

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.resolve('./drizzle'));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: './wrangler.toml' },
      }),
    ],
    // Tell Vite to bundle transitive deps of workspace packages instead of
    // externalising them — workerd can't resolve bare npm specifiers at runtime.
    ssr: {
      noExternal: true,
    },
    test: {
      setupFiles: ['./test/setup.ts'],
      provide: {
        D1_MIGRATIONS: migrations,
      },
    },
  };
});
