declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    LINKS: KVNamespace;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
