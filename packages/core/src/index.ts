// @qr-daddy/core: saved codes, magic-link sign-in and scan analytics on D1 + KV.
//
// A signed-in person's codes come in two kinds, through the same functions: dynamic codes encode
// a short link (slug in KV) and collect scans; static codes store the exact QR text, have no
// slug and no scans, and are upserted per user + content so a repeat download finds the same code.
// A code can keep its logo (a small base64 PNG/JPEG/WebP data URL, see validateLogo) so a download
// from Your codes matches the print; only getCode/createCode/updateCode return it, listCodes says
// whether there is one (`hasLogo`).
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
  validateLogo,
  MAX_TITLE_LENGTH,
  MAX_LOGO_LENGTH,
  LINK_CACHE_TTL_SECONDS,
  SHORT_LINK_ORIGIN,
  APP_ORIGIN,
} from "./codes";
export type {
  Code,
  DynamicCode,
  StaticCode,
  CodeKind,
  ContentType,
  CodeWithStats,
  CodeInput,
  CodePatch,
  CodeInputFailure,
  LinkTarget,
} from "./codes";

export { recordScan, scanSummary } from "./scans";
export type { Device, ScanInput, ScanSummary } from "./scans";

