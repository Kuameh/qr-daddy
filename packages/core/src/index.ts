// @qr-daddy/core: dynamic codes, magic-link sign-in and scan analytics on D1 + KV.
//
// Every function takes `Deps` first: `{ db: env.DB, kv: env.LINKS }`. Functions that read or
// write a user's data take `userId`, which must come from `getSession`, never from request input.
// Failures the user can fix come back as `{ ok: false, code, message }`; `message` is plain copy
// to show as-is. Anything else (D1/KV outages) throws.

export type { Env, Deps, Failure, Result } from "./deps";

export {
  requestMagicLink,
  cancelMagicLink,
  verifyMagicLink,
  getSession,
  signOut,
  normalizeEmail,
  LOGIN_LINK_TTL_MS,
  LOGIN_LINKS_PER_WINDOW,
  SESSION_TTL_MS,
  SESSION_COOKIE,
} from "./auth";
export type { User, Session, MagicLinkFailure } from "./auth";

export {
  createCode,
  updateCode,
  listCodes,
  getCode,
  deleteCode,
  resolveSlug,
  validateDestination,
  LINK_CACHE_TTL_SECONDS,
  SHORT_LINK_ORIGIN,
  APP_ORIGIN,
} from "./codes";
export type {
  Code,
  CodeWithStats,
  CodeInput,
  CodePatch,
  CodeInputFailure,
  LinkTarget,
} from "./codes";

export { recordScan, scanSummary } from "./scans";
export type { Device, ScanInput, ScanSummary } from "./scans";

