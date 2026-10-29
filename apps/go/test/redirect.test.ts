import { createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createCode, deleteCode, type Code } from "@qr-daddy/core";
import worker, { deviceClass } from "../src";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD =
  "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const ANDROID_TABLET =
  "Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const deps = { db: env.DB, kv: env.LINKS };

async function seedCode(destination = "https://example.com/menu"): Promise<Code & { userId: string }> {
  const userId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)")
    .bind(userId, `${userId}@example.com`, Date.now())
    .run();
  const result = await createCode(deps, userId, { destination });
  if (!result.ok) throw new Error(result.message);
  return { ...result.value, userId };
}

async function visit(path: string, init: RequestInit<IncomingRequestCfProperties> = {}) {
  const request = new Request<unknown, IncomingRequestCfProperties>(`https://q.ashiangmor.com${path}`, init);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env, ctx);
  await waitOnExecutionContext(ctx);
  return response;
}

async function scansFor(codeId: string) {
  const { results } = await env.DB.prepare(
    "SELECT country, city, device, referrer_host FROM scans WHERE code_id = ?",
  )
    .bind(codeId)
    .all();
  return results;
}

describe("redirect worker", () => {
  it("302s to the destination and records the scan on GET", async () => {
    const code = await seedCode();
    const response = await visit(`/${code.slug}`, {
      headers: { "User-Agent": IPHONE, Referer: "https://news.example/story" },
      cf: { country: "GH", city: "Accra" } as IncomingRequestCfProperties,
    });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/menu");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await scansFor(code.id)).toEqual([
      { country: "GH", city: "Accra", device: "mobile", referrer_host: "news.example" },
    ]);
  });

  it("ignores a trailing slash added by link rewriters", async () => {
    const code = await seedCode();
    const response = await visit(`/${code.slug}/`);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/menu");
  });

  it("302s on HEAD without recording a scan", async () => {
    const code = await seedCode();
    const response = await visit(`/${code.slug}`, { method: "HEAD", headers: { "User-Agent": IPHONE } });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://example.com/menu");
    expect(await scansFor(code.id)).toEqual([]);
  });

  it.each([
    "Googlebot/2.1 (+http://www.google.com/bot.html)",
    "Mozilla/5.0 (compatible; YandexSpider/3.0)",
    "facebookexternalhit/1.1 Crawler",
    "WhatsApp link preview",
  ])("redirects bots without recording a scan: %s", async (userAgent) => {
    const code = await seedCode();
    const response = await visit(`/${code.slug}`, { headers: { "User-Agent": userAgent } });
    expect(response.status).toBe(302);
    expect(await scansFor(code.id)).toEqual([]);
  });

  it("follows a destination change straight away", async () => {
    const code = await seedCode("https://old.example");
    await env.DB.prepare("UPDATE codes SET destination = ? WHERE id = ?").bind("https://new.example", code.id).run();
    await env.LINKS.delete(code.slug); // KV miss forces the D1 read
    const response = await visit(`/${code.slug}`);
    expect(response.headers.get("Location")).toBe("https://new.example");
  });

  it("shows the not-active page for unknown and deleted slugs", async () => {
    const code = await seedCode();
    const deleted = await deleteCode(deps, code.userId, code.id);
    expect(deleted.ok).toBe(true);

    for (const path of [`/${code.slug}`, "/zzzzzz", "/favicon.ico", `/${code.slug}/extra`]) {
      const response = await visit(path);
      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
      const body = await response.text();
      expect(body).toContain("This QR code isn't active anymore.");
      expect(body).toContain('href="https://qr.ashiangmor.com"');
    }
    expect(await scansFor(code.id)).toEqual([]);
  });

  it("sends the root to the app", async () => {
    const response = await visit("/");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://qr.ashiangmor.com");
  });

  it("refuses other methods", async () => {
    const code = await seedCode();
    const response = await visit(`/${code.slug}`, { method: "POST" });
    expect(response.status).toBe(405);
    expect(await scansFor(code.id)).toEqual([]);
  });
});

describe("deviceClass", () => {
  it.each([
    [IPHONE, "mobile"],
    [ANDROID_PHONE, "mobile"],
    [IPAD, "tablet"],
    [ANDROID_TABLET, "tablet"],
    [MAC, "desktop"],
    ["", "desktop"],
  ])("%s -> %s", (userAgent, device) => {
    expect(deviceClass(userAgent)).toBe(device);
  });
});
