import { DataTooLongError, encode } from "@qr-daddy/qr";
import { clock, DAY_MS, fail, ok, type Deps, type Failure, type Result } from "./deps";
import { isSlug, randomSlug } from "./random";

export const SHORT_LINK_ORIGIN = "https://q.ashiangmor.com";
export const APP_ORIGIN = "https://qr.ashiangmor.com";

const MAX_DESTINATION_LENGTH = 2048;
/** Roughly what one QR code holds; the generator stops well before this. */
/** Longest name a code can have. The web app trims generated names to this too. */
export const MAX_TITLE_LENGTH = 120;
const MAX_STYLE_LENGTH = 10_000;
const SLUG_ATTEMPTS = 5;

export type CodeKind = "dynamic" | "static";
/** What a code holds. Dynamic codes are always links. */
export type ContentType = "link" | "wifi" | "contact" | "sms" | "email";
const CONTENT_TYPES: readonly ContentType[] = ["link", "wifi", "contact", "sms", "email"];

interface CodeFields {
  id: string;
  /**
   * Dynamic: the link the short link sends people to.
   * Static: the exact text the QR code encodes (a link, a WIFI: string, a vCard…).
   */
  destination: string;
  title: string | null;
  /** Whatever JSON the app saved; this package doesn't interpret it. */
  style: unknown;
  createdAt: number;
  updatedAt: number;
}

export type DynamicCode = CodeFields & {
  kind: "dynamic";
  contentType: "link";
  slug: string;
  /** What the QR code encodes: `https://q.ashiangmor.com/<slug>`. */
  shortUrl: string;
};

export type StaticCode = CodeFields & { kind: "static"; contentType: ContentType; slug: null; shortUrl: null };

export type Code = DynamicCode | StaticCode;

/** Static codes have no scans, so their counts are always zero. */
export type CodeWithStats = Code & {
  totalScans: number;
  /** Scans in the 7 days up to now (rolling, not calendar days). */
  scansLast7Days: number;
  /** Scans per UTC day for the last 7 days, oldest first, today last. For sparklines. */
  dailyScans: number[];
  /** Epoch ms of the latest scan, or null when it has never been scanned. */
  lastScannedAt: number | null;
};

export interface CodeInput {
  /** Defaults to "dynamic". */
  kind?: CodeKind;
  /** Required for static codes; dynamic codes are always "link". */
  contentType?: ContentType;
  destination: string;
  /** Blank or null means no title. */
  title?: string | null;
  /** Any JSON-serialisable value; null means none. */
  style?: unknown;
}

/** Omitted fields are left as they are. A static code's destination can't change. */
export type CodePatch = Partial<Pick<CodeInput, "destination" | "title" | "style">>;

export type CodeInputFailure =
  | "bad_destination"
  | "bad_content_type"
  | "title_too_long"
  | "style_too_large"
  | "fixed_content";

/** The KV value stored under each slug. */
export interface LinkTarget {
  codeId: string;
  destination: string;
}

interface CodeRow {
  id: string;
  kind: CodeKind;
  content_type: ContentType;
  slug: string | null;
  destination: string;
  title: string | null;
  style_json: string | null;
  created_at: number;
  updated_at: number;
}

const CODE_COLUMNS = "id, kind, content_type, slug, destination, title, style_json, created_at, updated_at";

function toCode(row: CodeRow): Code {
  const fields: CodeFields = {
    id: row.id,
    destination: row.destination,
    title: row.title,
    style: row.style_json === null ? null : JSON.parse(row.style_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.kind === "static") return { ...fields, kind: "static", contentType: row.content_type, slug: null, shortUrl: null };
  const slug = row.slug!;
  return { ...fields, kind: "dynamic", contentType: "link", slug, shortUrl: `${SHORT_LINK_ORIGIN}/${slug}` };
}

/** The trimmed destination when it's an http(s) link of at most 2048 characters. */
export function validateDestination(destination: string): Result<string, "bad_destination"> {
  const trimmed = destination.trim();
  if (trimmed.length > MAX_DESTINATION_LENGTH) {
    return fail("bad_destination", "That link is too long. Use one under 2,048 characters.");
  }
  const url = URL.parse(trimmed);
  if (!url || (url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname) {
    return fail("bad_destination", "That link doesn't work. Check it starts with https://");
  }
  return ok(trimmed);
}

/**
 * A static code's content, stored exactly as the QR code encodes it (no trimming). It must fit in a
 * QR code at the error correction Your codes renders with, so a saved code can always be drawn.
 */
function validateStaticContent(content: string): Result<string, "bad_destination"> {
  if (!content.trim()) return fail("bad_destination", "There's nothing in this code yet. Add what it should hold.");
  try {
    encode(content);
  } catch (err) {
    if (err instanceof DataTooLongError) {
      return fail("bad_destination", "That's too much to fit in one QR code. Make it shorter.");
    }
    throw err;
  }
  return ok(content);
}

function validateTitle(title: string | null | undefined): Result<string | null, "title_too_long"> {
  const trimmed = title?.trim() || null;
  if (trimmed && trimmed.length > MAX_TITLE_LENGTH) {
    return fail("title_too_long", `That name is too long. Keep it under ${MAX_TITLE_LENGTH} characters.`);
  }
  return ok(trimmed);
}

function serializeStyle(style: unknown): Result<string | null, "style_too_large"> {
  const json = style === undefined || style === null ? null : JSON.stringify(style);
  if (json && json.length > MAX_STYLE_LENGTH) {
    return fail("style_too_large", "That design has too many settings to save. Remove some and try again.");
  }
  return ok(json);
}

/**
 * Saves a code for the user. `userId` must come from the session.
 *
 * Dynamic (the default): gets a fresh 6-character slug and is published to KV so it scans straight away.
 * Static: stores the exact QR text, with no slug and nothing in KV. Saving the same content again
 * returns the user's existing code with the new style (an upsert on the partial unique index
 * `codes_user_static_destination`), so repeat downloads never add a second row.
 */
export function createCode(
  deps: Deps,
  userId: string,
  input: CodeInput & { kind?: "dynamic" },
): Promise<Result<DynamicCode, CodeInputFailure>>;
export function createCode(deps: Deps, userId: string, input: CodeInput): Promise<Result<Code, CodeInputFailure>>;
export async function createCode(
  deps: Deps,
  userId: string,
  input: CodeInput,
): Promise<Result<Code, CodeInputFailure>> {
  const kind = input.kind ?? "dynamic";
  const contentType = input.contentType ?? "link";
  if (!CONTENT_TYPES.includes(contentType) || (kind === "dynamic" && contentType !== "link")) {
    return fail("bad_content_type", "We couldn't tell what this code holds. Reload the page and try again.");
  }
  const destination = kind === "static" ? validateStaticContent(input.destination) : validateDestination(input.destination);
  if (!destination.ok) return destination;
  const title = validateTitle(input.title);
  if (!title.ok) return title;
  const style = serializeStyle(input.style);
  if (!style.ok) return style;

  const now = clock(deps);
  const id = crypto.randomUUID();
  if (kind === "static") {
    // A title the user has since changed is kept; the style is the one just downloaded.
    const row = await deps.db
      .prepare(
        `INSERT INTO codes (id, user_id, kind, content_type, slug, destination, title, style_json, created_at, updated_at)
         VALUES (?, ?, 'static', ?, NULL, ?, ?, ?, ?, ?)
         ON CONFLICT (user_id, destination) WHERE kind = 'static' AND deleted_at IS NULL
         DO UPDATE SET style_json = excluded.style_json, title = COALESCE(codes.title, excluded.title), updated_at = excluded.updated_at
         RETURNING ${CODE_COLUMNS}`,
      )
      .bind(id, userId, contentType, destination.value, title.value, style.value, now, now)
      .first<CodeRow>();
    return ok(toCode(row!));
  }

  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const slug = (deps.newSlug ?? randomSlug)();
    const row = await deps.db
      .prepare(
        `INSERT INTO codes (id, user_id, slug, destination, title, style_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (slug) DO NOTHING RETURNING ${CODE_COLUMNS}`,
      )
      .bind(id, userId, slug, destination.value, title.value, style.value, now, now)
      .first<CodeRow>();
    if (row) {
      await putLink(deps, slug, { codeId: id, destination: destination.value });
      return ok(toCode(row));
    }
  }
  throw new Error(`No free slug after ${SLUG_ATTEMPTS} attempts`);
}

/**
 * Updates the user's code. A new destination is written through to KV so scans follow it at once.
 * A static code's content is the code itself, so changing its destination fails with `fixed_content`.
 */
export async function updateCode(
  deps: Deps,
  userId: string,
  codeId: string,
  patch: CodePatch,
): Promise<Result<Code, CodeInputFailure | "not_found">> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.destination !== undefined) {
    const destination = validateDestination(patch.destination);
    if (!destination.ok) {
      // A static code's content can't change at all; say that rather than "enter a link".
      return (await getCode(deps, userId, codeId))?.kind === "static" ? fixedContent() : destination;
    }
    sets.push("destination = ?");
    values.push(destination.value);
  }
  if (patch.title !== undefined) {
    const title = validateTitle(patch.title);
    if (!title.ok) return title;
    sets.push("title = ?");
    values.push(title.value);
  }
  if (patch.style !== undefined) {
    const style = serializeStyle(patch.style);
    if (!style.ok) return style;
    sets.push("style_json = ?");
    values.push(style.value);
  }
  sets.push("updated_at = ?");
  values.push(clock(deps));
  const onlyDynamic = patch.destination !== undefined ? " AND kind = 'dynamic'" : "";

  const row = await deps.db
    .prepare(
      `UPDATE codes SET ${sets.join(", ")} WHERE id = ? AND user_id = ? AND deleted_at IS NULL${onlyDynamic} RETURNING ${CODE_COLUMNS}`,
    )
    .bind(...values, codeId, userId)
    .first<CodeRow>();
  if (!row) {
    // Nothing changed either way; this read only picks the message.
    if (onlyDynamic && (await getCode(deps, userId, codeId))?.kind === "static") return fixedContent();
    return notFound();
  }
  if (patch.destination !== undefined && row.slug !== null) {
    await putLink(deps, row.slug, { codeId: row.id, destination: row.destination });
  }
  return ok(toCode(row));
}

/** The user's live codes of both kinds, newest first, with scan counts (zero for static codes). */
export async function listCodes(deps: Deps, userId: string): Promise<CodeWithStats[]> {
  const now = clock(deps);
  const firstDay = now - (now % DAY_MS) - 6 * DAY_MS;
  const [codes, daily] = await deps.db.batch([
    deps.db
      .prepare(
        `SELECT ${CODE_COLUMNS},
           (SELECT COUNT(*) FROM scans s WHERE s.code_id = c.id) AS total_scans,
           (SELECT COUNT(*) FROM scans s WHERE s.code_id = c.id AND s.scanned_at >= ?2) AS recent_scans,
           (SELECT MAX(s.scanned_at) FROM scans s WHERE s.code_id = c.id) AS last_scanned_at
         FROM codes c WHERE c.user_id = ?1 AND c.deleted_at IS NULL ORDER BY c.created_at DESC`,
      )
      .bind(userId, now - 7 * DAY_MS),
    deps.db
      .prepare(
        `SELECT s.code_id AS code_id, CAST((s.scanned_at - ?2) / ${DAY_MS} AS INTEGER) AS day, COUNT(*) AS scans
         FROM scans s JOIN codes c ON c.id = s.code_id
         WHERE c.user_id = ?1 AND c.deleted_at IS NULL AND s.scanned_at >= ?2 GROUP BY 1, 2`,
      )
      .bind(userId, firstDay),
  ]);

  const perCode = new Map<string, number[]>();
  for (const row of daily.results as { code_id: string; day: number; scans: number }[]) {
    const days = perCode.get(row.code_id) ?? Array<number>(7).fill(0);
    days[row.day] = row.scans;
    perCode.set(row.code_id, days);
  }
  return (codes.results as (CodeRow & { total_scans: number; recent_scans: number; last_scanned_at: number | null })[]).map(
    (row) => ({
      ...toCode(row),
      totalScans: row.total_scans,
      scansLast7Days: row.recent_scans,
      dailyScans: perCode.get(row.id) ?? Array<number>(7).fill(0),
      lastScannedAt: row.last_scanned_at,
    }),
  );
}

/** The user's code, or null when it doesn't exist, is deleted or belongs to someone else. */
export async function getCode(deps: Deps, userId: string, codeId: string): Promise<Code | null> {
  const row = await deps.db
    .prepare(`SELECT ${CODE_COLUMNS} FROM codes WHERE id = ? AND user_id = ? AND deleted_at IS NULL`)
    .bind(codeId, userId)
    .first<CodeRow>();
  return row ? toCode(row) : null;
}

/**
 * Soft-deletes the user's code (its slug is never reused), deletes its scans, and removes the
 * slug from KV, so scans get the "not active" page. A static code has no slug: printed copies
 * keep working, because the content is in the code itself.
 */
export async function deleteCode(
  deps: Deps,
  userId: string,
  codeId: string,
): Promise<Result<void, "not_found">> {
  const now = clock(deps);
  const row = await deps.db
    .prepare(
      "UPDATE codes SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL RETURNING slug",
    )
    .bind(now, now, codeId, userId)
    .first<{ slug: string | null }>();
  if (!row) return notFound();
  await deps.db.prepare("DELETE FROM scans WHERE code_id = ?").bind(codeId).run();
  if (row.slug !== null) await deps.kv.delete(row.slug);
  return ok();
}

/**
 * Where a slug points, for the redirect Worker. Reads KV first; on a miss, reads D1 and writes the
 * answer back to KV. Null for malformed, unknown and deleted slugs.
 */
export async function resolveSlug(deps: Deps, slug: string): Promise<LinkTarget | null> {
  if (!isSlug(slug)) return null;
  const cached = await deps.kv.get<LinkTarget>(slug, "json");
  if (cached) return cached;
  const row = await deps.db
    .prepare("SELECT id, destination FROM codes WHERE slug = ? AND deleted_at IS NULL")
    .bind(slug)
    .first<{ id: string; destination: string }>();
  if (!row) return null;
  const target = { codeId: row.id, destination: row.destination };
  await putLink(deps, slug, target);
  return target;
}

/**
 * KV is a cache in front of D1, which stays the source of truth. Entries expire so that a
 * write-through racing a delete or an out-of-order update can be wrong for minutes, not forever.
 */
export const LINK_CACHE_TTL_SECONDS = 600;

function putLink(deps: Deps, slug: string, target: LinkTarget): Promise<void> {
  return deps.kv.put(slug, JSON.stringify(target), { expirationTtl: LINK_CACHE_TTL_SECONDS });
}

function fixedContent(): Failure<"fixed_content"> {
  return fail("fixed_content", "This code holds its content in the pattern itself, so it can't be changed. Make a new code instead.");
}

function notFound(): Failure<"not_found"> {
  return fail("not_found", "We couldn't find that QR code. It may have been deleted.");
}
