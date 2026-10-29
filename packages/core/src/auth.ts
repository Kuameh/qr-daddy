import { clock, fail, ok, type Deps, type Result } from "./deps";
import { randomToken, sha256Hex } from "./random";

export const LOGIN_LINK_TTL_MS = 15 * 60 * 1000;
/** Sign-in links one email can ask for per {@link LOGIN_LINK_TTL_MS}. */
export const LOGIN_LINKS_PER_WINDOW = 3;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Cookie name for the session. Set it HttpOnly, Secure, SameSite=Lax, Path=/, expiring at the session's `expiresAt`. */
export const SESSION_COOKIE = "qd_session";

export interface User {
  id: string;
  email: string;
  createdAt: number;
}

export interface Session {
  user: User;
  expiresAt: number;
}

export type MagicLinkFailure = "expired" | "used" | "unknown";

interface UserRow {
  id: string;
  email: string;
  created_at: number;
}

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trimmed, lowercased email, or null when it isn't shaped like one. */
export function normalizeEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  return normalized.length <= 254 && EMAIL_SHAPE.test(normalized) ? normalized : null;
}

/**
 * Creates a single-use sign-in link token for `email`, valid for 15 minutes.
 * Only its hash is stored, so the returned `token` is the only copy: put it in the emailed link.
 * At most 3 links per email per 15 minutes, so nobody can flood an inbox.
 */
export async function requestMagicLink(
  deps: Deps,
  email: string,
): Promise<Result<{ token: string; expiresAt: number }, "bad_email" | "rate_limited">> {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return fail("bad_email", "That email address doesn't look right. Check it and try again.");
  }
  const now = clock(deps);
  const token = randomToken();
  const expiresAt = now + LOGIN_LINK_TTL_MS;
  // Every link lives exactly LOGIN_LINK_TTL_MS, so links still unexpired are the ones asked for
  // in the last 15 minutes, used or not. Counting and inserting in one statement keeps the limit
  // exact under parallel requests: D1 runs each statement atomically.
  const inserted = await deps.db
    .prepare(
      `INSERT INTO login_tokens (token_hash, email, expires_at)
       SELECT ?1, ?2, ?3
       WHERE (SELECT COUNT(*) FROM login_tokens WHERE email = ?2 AND expires_at > ?4) < ?5`,
    )
    .bind(await sha256Hex(token), normalized, expiresAt, now, LOGIN_LINKS_PER_WINDOW)
    .run();
  if (inserted.meta.changes !== 1) {
    return fail(
      "rate_limited",
      "We've sent a few links already. Check your inbox, or try again in 15 minutes.",
    );
  }
  return ok({ token, expiresAt });
}

/**
 * Withdraws a sign-in link that could not be delivered, so a failed send doesn't use up one of
 * the person's links for this window.
 */
export async function cancelMagicLink(deps: Deps, token: string): Promise<void> {
  await deps.db
    .prepare("DELETE FROM login_tokens WHERE token_hash = ? AND used_at IS NULL")
    .bind(await sha256Hex(token))
    .run();
}

/**
 * Uses up a sign-in link token and starts a 30-day session, creating the user on first sign-in.
 * `sessionToken` is the cookie value; only its hash is stored.
 */
export async function verifyMagicLink(
  deps: Deps,
  token: string,
): Promise<Result<{ sessionToken: string; expiresAt: number; user: User }, MagicLinkFailure>> {
  const now = clock(deps);
  const tokenHash = await sha256Hex(token);

  // Claiming and checking in one statement keeps the link single-use even under concurrent clicks.
  const claimed = await deps.db
    .prepare(
      "UPDATE login_tokens SET used_at = ?1 WHERE token_hash = ?2 AND used_at IS NULL AND expires_at > ?1 RETURNING email",
    )
    .bind(now, tokenHash)
    .first<{ email: string }>();

  if (!claimed) {
    const row = await deps.db
      .prepare("SELECT used_at FROM login_tokens WHERE token_hash = ?")
      .bind(tokenHash)
      .first<{ used_at: number | null }>();
    if (!row) return fail("unknown", "That sign-in link doesn't work. Ask for a new one.");
    if (row.used_at !== null) {
      return fail("used", "That sign-in link has already been used. Ask for a new one.");
    }
    return fail("expired", "That sign-in link has expired. Ask for a new one.");
  }

  const userRow = await deps.db
    .prepare(
      "INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (email) DO UPDATE SET email = excluded.email RETURNING id, email, created_at",
    )
    .bind(crypto.randomUUID(), claimed.email, now)
    .first<UserRow>();
  if (!userRow) throw new Error("users upsert returned no row");

  const sessionToken = randomToken();
  const expiresAt = now + SESSION_TTL_MS;
  await deps.db
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256Hex(sessionToken), userRow.id, expiresAt, now)
    .run();

  return ok({ sessionToken, expiresAt, user: toUser(userRow) });
}

/** The signed-in user for a session cookie value, or null when it's unknown, signed out or expired. */
export async function getSession(deps: Deps, sessionToken: string): Promise<Session | null> {
  const row = await deps.db
    .prepare(
      "SELECT u.id, u.email, u.created_at, s.expires_at FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?",
    )
    .bind(await sha256Hex(sessionToken), clock(deps))
    .first<UserRow & { expires_at: number }>();
  return row ? { user: toUser(row), expiresAt: row.expires_at } : null;
}

/** Ends the session. Safe to call with an unknown or already-ended session. */
export async function signOut(deps: Deps, sessionToken: string): Promise<void> {
  await deps.db
    .prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256Hex(sessionToken))
    .run();
}
