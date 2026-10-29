import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  getSession,
  LOGIN_LINK_TTL_MS,
  LOGIN_LINKS_PER_WINDOW,
  cancelMagicLink,
  requestMagicLink,
  SESSION_TTL_MS,
  signOut,
  verifyMagicLink,
} from "../src";
import { sha256Hex } from "../src/random";
import { START, testDeps, unwrap } from "./helpers";

describe("magic link", () => {
  it("signs in, stores only hashes, and reuses the user on the next sign-in", async () => {
    const { deps } = testDeps();
    const { token, expiresAt } = unwrap(await requestMagicLink(deps, "  Ama@Example.COM "));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(expiresAt).toBe(START + LOGIN_LINK_TTL_MS);

    const stored = await env.DB.prepare("SELECT token_hash, email FROM login_tokens WHERE email = ?")
      .bind("ama@example.com")
      .first<{ token_hash: string; email: string }>();
    expect(stored?.token_hash).toBe(await sha256Hex(token));

    const signedIn = unwrap(await verifyMagicLink(deps, token));
    expect(signedIn.user.email).toBe("ama@example.com");
    expect(signedIn.expiresAt).toBe(START + SESSION_TTL_MS);
    const sessionRow = await env.DB.prepare("SELECT token_hash FROM sessions WHERE user_id = ?")
      .bind(signedIn.user.id)
      .first<{ token_hash: string }>();
    expect(sessionRow?.token_hash).toBe(await sha256Hex(signedIn.sessionToken));

    const again = unwrap(await requestMagicLink(deps, "ama@example.com"));
    const second = unwrap(await verifyMagicLink(deps, again.token));
    expect(second.user.id).toBe(signedIn.user.id);
    expect(second.sessionToken).not.toBe(signedIn.sessionToken);
  });

  it("rejects an expired link", async () => {
    const { deps, advance } = testDeps();
    const { token } = unwrap(await requestMagicLink(deps, "late@example.com"));
    advance(LOGIN_LINK_TTL_MS);
    expect(await verifyMagicLink(deps, token)).toEqual({
      ok: false,
      code: "expired",
      message: "That sign-in link has expired. Ask for a new one.",
    });
  });

  it("rejects a link used twice", async () => {
    const { deps } = testDeps();
    const { token } = unwrap(await requestMagicLink(deps, "twice@example.com"));
    unwrap(await verifyMagicLink(deps, token));
    const reused = await verifyMagicLink(deps, token);
    expect(reused.ok || reused.code).toBe("used");
  });

  it("rejects a link it never issued", async () => {
    const { deps } = testDeps();
    const result = await verifyMagicLink(deps, "not-a-real-token");
    expect(result.ok || result.code).toBe("unknown");
  });

  it("rejects an email that isn't shaped like one", async () => {
    const { deps } = testDeps();
    for (const email of ["", "ama", "ama@example", "a b@example.com"]) {
      const result = await requestMagicLink(deps, email);
      expect(result.ok || result.code).toBe("bad_email");
    }
  });
});

describe("sign-in link rate limit", () => {
  const limited = {
    ok: false,
    code: "rate_limited",
    message: "We've sent a few links already. Check your inbox, or try again in 15 minutes.",
  };

  it("allows 3 links per email per 15 minutes, used or not", async () => {
    const { deps, advance } = testDeps();
    const first = unwrap(await requestMagicLink(deps, "busy@example.com"));
    unwrap(await verifyMagicLink(deps, first.token));
    advance(60_000);
    unwrap(await requestMagicLink(deps, "busy@example.com"));
    unwrap(await requestMagicLink(deps, " BUSY@example.com"));
    expect(await requestMagicLink(deps, "busy@example.com")).toEqual(limited);
    expect(LOGIN_LINKS_PER_WINDOW).toBe(3);

    // Other addresses aren't affected.
    unwrap(await requestMagicLink(deps, "calm@example.com"));
  });

  it("allows another link once the oldest is 15 minutes old", async () => {
    const { deps, advance } = testDeps();
    for (let i = 0; i < 3; i++) {
      unwrap(await requestMagicLink(deps, "patient@example.com"));
      advance(60_000);
    }
    expect(await requestMagicLink(deps, "patient@example.com")).toEqual(limited);
    advance(LOGIN_LINK_TTL_MS - 3 * 60_000 - 1);
    expect(await requestMagicLink(deps, "patient@example.com")).toEqual(limited);
    advance(1);
    unwrap(await requestMagicLink(deps, "patient@example.com"));
  });

  it("holds the limit when requests arrive at the same time", async () => {
    const { deps } = testDeps();
    const results = await Promise.all(Array.from({ length: 10 }, () => requestMagicLink(deps, "flood@example.com")));
    expect(results.filter((r) => r.ok)).toHaveLength(3);
    expect(results.filter((r) => !r.ok && r.code === "rate_limited")).toHaveLength(7);
  });

  it("gives the slot back when a link is cancelled because it couldn't be sent", async () => {
    const { deps } = testDeps();
    unwrap(await requestMagicLink(deps, "bounce@example.com"));
    unwrap(await requestMagicLink(deps, "bounce@example.com"));
    const failedSend = unwrap(await requestMagicLink(deps, "bounce@example.com"));
    expect(await requestMagicLink(deps, "bounce@example.com")).toEqual(limited);
    await cancelMagicLink(deps, failedSend.token);
    unwrap(await requestMagicLink(deps, "bounce@example.com"));
    expect((await verifyMagicLink(deps, failedSend.token)).ok).toBe(false);
  });
});

describe("session", () => {
  async function startSession() {
    const clock = testDeps();
    const { token } = unwrap(await requestMagicLink(clock.deps, `${crypto.randomUUID()}@example.com`));
    return { ...clock, ...unwrap(await verifyMagicLink(clock.deps, token)) };
  }

  it("finds the user until the session expires", async () => {
    const { deps, advance, sessionToken, user } = await startSession();
    expect(await getSession(deps, sessionToken)).toEqual({ user, expiresAt: START + SESSION_TTL_MS });
    advance(SESSION_TTL_MS - 1);
    expect((await getSession(deps, sessionToken))?.user.id).toBe(user.id);
    advance(1);
    expect(await getSession(deps, sessionToken)).toBeNull();
  });

  it("ends on sign-out", async () => {
    const { deps, sessionToken } = await startSession();
    await signOut(deps, sessionToken);
    expect(await getSession(deps, sessionToken)).toBeNull();
    await signOut(deps, sessionToken);
  });

  it("returns null for an unknown session", async () => {
    const { deps } = testDeps();
    expect(await getSession(deps, "nope")).toBeNull();
  });
});
