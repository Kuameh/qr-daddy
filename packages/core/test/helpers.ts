import { env } from "cloudflare:workers";
import { expect } from "vitest";
import { requestMagicLink, verifyMagicLink, type Deps, type Result, type User } from "../src";

export const START = Date.UTC(2026, 9, 29, 12, 0, 0);

/** Deps on the test D1/KV with a clock the test moves by hand. */
export function testDeps(overrides: Partial<Deps> = {}) {
  let now = START;
  const deps: Deps = { db: env.DB, kv: env.LINKS, now: () => now, ...overrides };
  return {
    deps,
    advance(ms: number) {
      now += ms;
    },
    set(ms: number) {
      now = ms;
    },
  };
}

export function unwrap<T>(result: Result<T, string>): T {
  if (!result.ok) expect.fail(`expected ok, got ${result.code}: ${result.message}`);
  return result.value;
}

export async function signIn(deps: Deps, email = `${crypto.randomUUID()}@example.com`): Promise<User> {
  const { token } = unwrap(await requestMagicLink(deps, email));
  return unwrap(await verifyMagicLink(deps, token)).user;
}
