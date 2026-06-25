/// <reference types="@cloudflare/vitest-pool-workers/types" />

// Augment the Cloudflare.Env interface with the bindings declared in wrangler.toml
// so that `env.DB` from `cloudflare:test` is typed as D1Database.
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
  }
}
