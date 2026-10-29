import { describe, expect, it } from "vitest";
import { createCode, listCodes, magicLinkEmail, recordScan, scanSummary, type ScanInput } from "../src";
import { DAY_MS } from "../src/deps";
import { signIn, START, testDeps, unwrap } from "./helpers";

describe("scanSummary", () => {
  it("aggregates scans per day, country and device inside the window", async () => {
    const { deps, set } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://example.com" }));
    const other = unwrap(await createCode(deps, user.id, { destination: "https://example.org" }));

    const scanAt = async (at: number, scan: Omit<ScanInput, "codeId">, codeId = code.id) => {
      set(at);
      await recordScan(deps, { codeId, ...scan });
    };
    await scanAt(START - 40 * DAY_MS, { country: "GH", device: "mobile" }); // outside 30 days
    await scanAt(START - 8 * DAY_MS, { country: "NG", device: "desktop" }); // outside the 7-day count
    await scanAt(START - 2 * DAY_MS, { country: "GH", city: "Kumasi", device: "tablet" });
    await scanAt(START - 1000, { country: "GH", city: "Accra", device: "mobile" });
    await scanAt(START - 500, { country: "US", device: "desktop", referrerHost: "news.example" });
    await scanAt(START, { country: null, device: "mobile" });
    await scanAt(START, { country: "GH", device: "mobile" }, other.id); // another code
    set(START);

    const summary = await scanSummary(deps, user.id, code.id);
    expect(summary?.total).toBe(5);
    expect(summary?.allTime).toBe(6);
    expect(summary?.last7Days).toBe(4);
    expect(summary?.perDay).toHaveLength(30);
    expect(summary?.perDay[0]).toEqual({ date: "2026-09-30", scans: 0 });
    expect(summary?.perDay.at(-1)).toEqual({ date: "2026-10-29", scans: 3 });
    expect(summary?.perDay.filter((d) => d.scans > 0)).toEqual([
      { date: "2026-10-21", scans: 1 },
      { date: "2026-10-27", scans: 1 },
      { date: "2026-10-29", scans: 3 },
    ]);
    expect(summary?.countries).toEqual([
      { country: "GH", scans: 2 },
      { country: null, scans: 1 },
      { country: "NG", scans: 1 },
      { country: "US", scans: 1 },
    ]);
    expect(summary?.devices).toEqual([
      { device: "desktop", scans: 2 },
      { device: "mobile", scans: 2 },
      { device: "tablet", scans: 1 },
    ]);

    const week = await scanSummary(deps, user.id, code.id, { days: 7 });
    expect(week?.total).toBe(4);
    expect(week?.perDay.map((d) => d.date)).toEqual([
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
    ]);

    const listed = await listCodes(deps, user.id);
    expect(listed.find((c) => c.id === code.id)).toMatchObject({
      totalScans: 6,
      scansLast7Days: 4,
      // 23 Oct .. 29 Oct (UTC): the 27 Oct scan, then three today.
      dailyScans: [0, 0, 0, 0, 1, 0, 3],
      lastScannedAt: START,
    });
    expect(listed.find((c) => c.id === other.id)).toMatchObject({
      totalScans: 1,
      scansLast7Days: 1,
      dailyScans: [0, 0, 0, 0, 0, 0, 1],
      lastScannedAt: START,
    });
  });

  it("returns empty days for a code with no scans", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://example.com" }));
    const summary = await scanSummary(deps, user.id, code.id, { days: 3 });
    expect(summary).toEqual({
      total: 0,
      allTime: 0,
      last7Days: 0,
      perDay: [
        { date: "2026-10-27", scans: 0 },
        { date: "2026-10-28", scans: 0 },
        { date: "2026-10-29", scans: 0 },
      ],
      countries: [],
      devices: [],
    });
    expect(await listCodes(deps, user.id)).toMatchObject([
      { id: code.id, totalScans: 0, dailyScans: [0, 0, 0, 0, 0, 0, 0], lastScannedAt: null },
    ]);
  });
});

describe("magicLinkEmail", () => {
  it("puts the link in both parts and escapes it in the HTML", () => {
    const link = "https://qr.ashiangmor.com/auth/verify?token=abc&next=/codes";
    const email = magicLinkEmail({ link });
    expect(email.subject).toBe("Sign in to QR Daddy");
    expect(email.text).toContain(link);
    expect(email.html).toContain('href="https://qr.ashiangmor.com/auth/verify?token=abc&amp;next=/codes"');
  });
});
