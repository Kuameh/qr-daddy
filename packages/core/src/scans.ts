import { clock, DAY_MS, type Deps } from "./deps";
import { getCode } from "./codes";

export type Device = "mobile" | "tablet" | "desktop";

export interface ScanInput {
  codeId: string;
  /** ISO 3166 alpha-2 from `request.cf.country`. */
  country?: string | null;
  city?: string | null;
  device?: Device | null;
  referrerHost?: string | null;
}

export interface ScanSummary {
  /** Scans inside the window, not all time. */
  total: number;
  /** Every scan the code has had. */
  allTime: number;
  /** Scans in the 7 days up to now (rolling), the same count `listCodes` gives. */
  last7Days: number;
  /** One entry per UTC day in the window, oldest first, including days with no scans. */
  perDay: { date: string; scans: number }[];
  /** Most scans first. `country` is null when Cloudflare couldn't place the scan. */
  countries: { country: string | null; scans: number }[];
  devices: { device: Device | null; scans: number }[];
}

/** Records one scan. Called by the redirect Worker with the code id from `resolveSlug`. */
export async function recordScan(deps: Deps, scan: ScanInput): Promise<void> {
  await deps.db
    .prepare(
      "INSERT INTO scans (code_id, scanned_at, country, city, device, referrer_host) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(
      scan.codeId,
      clock(deps),
      scan.country ?? null,
      scan.city ?? null,
      scan.device ?? null,
      scan.referrerHost ?? null,
    )
    .run();
}

/**
 * Scan analytics for the user's code over the last `days` UTC days, today included (1 to 365).
 * Null when the code doesn't exist, is deleted or belongs to someone else.
 */
export async function scanSummary(
  deps: Deps,
  userId: string,
  codeId: string,
  { days = 30 }: { days?: number } = {},
): Promise<ScanSummary | null> {
  if (!(await getCode(deps, userId, codeId))) return null;

  const span = Math.min(Math.max(Math.floor(days), 1), 365);
  const now = clock(deps);
  const since = now - (now % DAY_MS) - (span - 1) * DAY_MS;

  const scoped = `FROM scans s JOIN codes c ON c.id = s.code_id
    WHERE s.code_id = ?1 AND c.user_id = ?2 AND s.scanned_at >= ?3`;
  const query = (sql: string) => deps.db.prepare(sql).bind(codeId, userId, since);
  const [daily, countries, devices, totals] = await deps.db.batch([
    query(`SELECT date(s.scanned_at / 1000, 'unixepoch') AS date, COUNT(*) AS scans ${scoped} GROUP BY 1`),
    query(`SELECT s.country AS country, COUNT(*) AS scans ${scoped} GROUP BY 1 ORDER BY 2 DESC, 1`),
    query(`SELECT s.device AS device, COUNT(*) AS scans ${scoped} GROUP BY 1 ORDER BY 2 DESC, 1`),
    deps.db
      .prepare(
        `SELECT COUNT(*) AS all_time, COUNT(CASE WHEN s.scanned_at >= ?3 THEN 1 END) AS last_7_days
         FROM scans s JOIN codes c ON c.id = s.code_id WHERE s.code_id = ?1 AND c.user_id = ?2`,
      )
      .bind(codeId, userId, now - 7 * DAY_MS),
  ]);
  const { all_time, last_7_days } = (totals.results as { all_time: number; last_7_days: number }[])[0];

  const byDate = new Map(
    (daily.results as { date: string; scans: number }[]).map((row) => [row.date, row.scans]),
  );
  const perDay = Array.from({ length: span }, (_, i) => {
    const date = new Date(since + i * DAY_MS).toISOString().slice(0, 10);
    return { date, scans: byDate.get(date) ?? 0 };
  });

  return {
    total: perDay.reduce((sum, day) => sum + day.scans, 0),
    allTime: all_time,
    last7Days: last_7_days,
    perDay,
    countries: countries.results as ScanSummary["countries"],
    devices: devices.results as ScanSummary["devices"],
  };
}
