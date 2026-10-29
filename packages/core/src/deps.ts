/** Worker bindings this package needs. Bind them under these names in wrangler.jsonc. */
export interface Env {
  DB: D1Database;
  /** Slug -> {@link LinkTarget} JSON, read on every scan. */
  LINKS: KVNamespace;
}

/** What every domain function takes first. Build it per request: `{ db: env.DB, kv: env.LINKS }`. */
export interface Deps {
  db: D1Database;
  kv: KVNamespace;
  /** Epoch ms. Defaults to `Date.now`; tests pass a fixed clock. */
  now?: () => number;
  /** Slug generator. Defaults to a random 6-character base62 slug; tests pass a fixed sequence. */
  newSlug?: () => string;
}

/** A failure the user caused or can fix. `message` is plain copy, safe to show as-is. */
export interface Failure<C extends string> {
  ok: false;
  code: C;
  message: string;
}

export type Result<T, C extends string> = { ok: true; value: T } | Failure<C>;

export function ok<T = void>(value?: T): { ok: true; value: T } {
  return { ok: true, value: value as T };
}

export function fail<C extends string>(code: C, message: string): Failure<C> {
  return { ok: false, code, message };
}

export function clock(deps: Deps): number {
  return (deps.now ?? Date.now)();
}

export const DAY_MS = 24 * 60 * 60 * 1000;
