import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import {
  createCode,
  deleteCode,
  getCode,
  listCodes,
  resolveSlug,
  scanSummary,
  updateCode,
  validateDestination,
  recordScan,
  LINK_CACHE_TTL_SECONDS,
} from "../src";
import { randomSlug } from "../src/random";
import { signIn, START, testDeps, unwrap } from "./helpers";

describe("codes", () => {
  it("creates, reads, updates, lists and deletes a code", async () => {
    const { deps, advance } = testDeps();
    const user = await signIn(deps);

    const code = unwrap(
      await createCode(deps, user.id, {
        destination: " https://example.com/menu ",
        title: " Menu ",
        style: { pattern: "dots", fg: "ink" },
      }),
    );
    expect(code).toMatchObject({
      destination: "https://example.com/menu",
      title: "Menu",
      style: { pattern: "dots", fg: "ink" },
      createdAt: START,
      updatedAt: START,
    });
    expect(code.slug).toMatch(/^[0-9A-Za-z]{6}$/);
    expect(code.shortUrl).toBe(`https://q.ashiangmor.com/${code.slug}`);
    expect(await env.LINKS.get(code.slug, "json")).toEqual({
      codeId: code.id,
      destination: "https://example.com/menu",
    });
    expect(await getCode(deps, user.id, code.id)).toEqual(code);

    advance(1000);
    const renamed = unwrap(await updateCode(deps, user.id, code.id, { title: "", style: null }));
    expect(renamed).toMatchObject({ title: null, style: null, destination: code.destination, updatedAt: START + 1000 });

    const moved = unwrap(await updateCode(deps, user.id, code.id, { destination: "http://example.org" }));
    expect(moved.destination).toBe("http://example.org");
    expect(await env.LINKS.get(code.slug, "json")).toEqual({ codeId: code.id, destination: "http://example.org" });

    const second = unwrap(await createCode(deps, user.id, { destination: "https://example.com/2" }));
    expect((await listCodes(deps, user.id)).map((c) => c.id)).toEqual([second.id, code.id]);
    expect(second.createdAt).toBeGreaterThan(code.createdAt);

    expect(unwrap(await deleteCode(deps, user.id, code.id))).toBeUndefined();
    expect(await getCode(deps, user.id, code.id)).toBeNull();
    expect(await env.LINKS.get(code.slug)).toBeNull();
    expect(await resolveSlug(deps, code.slug)).toBeNull();
    expect((await listCodes(deps, user.id)).map((c) => c.id)).toEqual([second.id]);

    const again = await deleteCode(deps, user.id, code.id);
    expect(again.ok || again.code).toBe("not_found");
    const update = await updateCode(deps, user.id, code.id, { title: "back" });
    expect(update.ok || update.code).toBe("not_found");
  });

  it("never lets one user see or change another user's code", async () => {
    const { deps } = testDeps();
    const owner = await signIn(deps);
    const other = await signIn(deps);
    const code = unwrap(await createCode(deps, owner.id, { destination: "https://owner.example" }));

    expect(await getCode(deps, other.id, code.id)).toBeNull();
    expect(await listCodes(deps, other.id)).toEqual([]);
    expect(await scanSummary(deps, other.id, code.id)).toBeNull();
    const update = await updateCode(deps, other.id, code.id, { destination: "https://evil.example" });
    expect(update.ok || update.code).toBe("not_found");
    const removal = await deleteCode(deps, other.id, code.id);
    expect(removal.ok || removal.code).toBe("not_found");

    expect(await getCode(deps, owner.id, code.id)).toEqual(code);
    expect(await resolveSlug(deps, code.slug)).toEqual({ codeId: code.id, destination: "https://owner.example" });
  });

  it("picks a new slug when the first one is taken", async () => {
    const taken = randomSlug();
    const fresh = randomSlug();
    const slugs = [taken, taken, fresh];
    const { deps } = testDeps({ newSlug: () => slugs.shift()! });
    const user = await signIn(deps);

    const first = unwrap(await createCode(deps, user.id, { destination: "https://a.example" }));
    const second = unwrap(await createCode(deps, user.id, { destination: "https://b.example" }));
    expect(first.slug).toBe(taken);
    expect(second.slug).toBe(fresh);
    expect(await resolveSlug(deps, taken)).toEqual({ codeId: first.id, destination: "https://a.example" });
  });

  it("gives up after five taken slugs", async () => {
    const taken = randomSlug();
    const { deps } = testDeps({ newSlug: () => taken });
    const user = await signIn(deps);
    unwrap(await createCode(deps, user.id, { destination: "https://a.example" }));
    await expect(createCode(deps, user.id, { destination: "https://b.example" })).rejects.toThrow(/No free slug/);
  });

  it("checks titles and style size", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const long = await createCode(deps, user.id, { destination: "https://a.example", title: "x".repeat(121) });
    expect(long.ok || long.code).toBe("title_too_long");
    const big = await createCode(deps, user.id, { destination: "https://a.example", style: "x".repeat(10_000) });
    expect(big.ok || big.code).toBe("style_too_large");
  });
});

describe("destinations", () => {
  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/file",
    "mailto:ama@example.com",
    "example.com",
    "",
    "https://",
  ])("rejects %j", (destination) => {
    expect(validateDestination(destination)).toEqual({
      ok: false,
      code: "bad_destination",
      message: "That link doesn't work. Check it starts with https://",
    });
  });

  it("rejects links over 2048 characters", () => {
    const destination = `https://example.com/${"a".repeat(2049 - 20)}`;
    expect(destination).toHaveLength(2049);
    const result = validateDestination(destination);
    expect(result.ok || result.message).toBe("That link is too long. Use one under 2,048 characters.");
    expect(validateDestination(destination.slice(0, 2048)).ok).toBe(true);
  });

  it("accepts http and https", () => {
    expect(validateDestination("http://example.com")).toEqual({ ok: true, value: "http://example.com" });
    expect(validateDestination(" https://example.com/a?b=c#d ")).toEqual({
      ok: true,
      value: "https://example.com/a?b=c#d",
    });
  });

  it("refuses to save or update a bad destination", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const created = await createCode(deps, user.id, { destination: "javascript:alert(1)" });
    expect(created.ok || created.code).toBe("bad_destination");
    expect(await listCodes(deps, user.id)).toEqual([]);

    const code = unwrap(await createCode(deps, user.id, { destination: "https://ok.example" }));
    const updated = await updateCode(deps, user.id, code.id, { destination: "data:text/html,hi" });
    expect(updated.ok || updated.code).toBe("bad_destination");
    expect((await getCode(deps, user.id, code.id))?.destination).toBe("https://ok.example");
    expect(await env.LINKS.get(code.slug, "json")).toEqual({ codeId: code.id, destination: "https://ok.example" });
  });
});

describe("resolveSlug", () => {
  it("serves from KV when the slug is there", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://d1.example" }));
    await env.LINKS.put(code.slug, JSON.stringify({ codeId: code.id, destination: "https://kv.example" }));
    expect(await resolveSlug(deps, code.slug)).toEqual({ codeId: code.id, destination: "https://kv.example" });
  });

  it("falls back to D1 on a KV miss and writes the answer back", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://d1.example" }));
    await env.LINKS.delete(code.slug);

    const target = { codeId: code.id, destination: "https://d1.example" };
    expect(await resolveSlug(deps, code.slug)).toEqual(target);
    expect(await env.LINKS.get(code.slug, "json")).toEqual(target);
  });

  it("returns null for unknown and malformed slugs", async () => {
    const { deps } = testDeps();
    expect(await resolveSlug(deps, randomSlug())).toBeNull();
    for (const slug of ["", "abc", "abcdefg", "abc-12", "../x/y"]) {
      expect(await resolveSlug(deps, slug)).toBeNull();
    }
  });

  it("does not bring a deleted code back from D1", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://gone.example" }));
    unwrap(await deleteCode(deps, user.id, code.id));
    expect(await resolveSlug(deps, code.slug)).toBeNull();
    expect(await env.LINKS.get(code.slug)).toBeNull();
  });

  it("deletes a code's scans with it", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://private.example" }));
    await recordScan(deps, { codeId: code.id, country: "GH", city: "Accra", device: "mobile" });
    unwrap(await deleteCode(deps, user.id, code.id));
    const left = await env.DB.prepare("SELECT COUNT(*) AS n FROM scans WHERE code_id = ?").bind(code.id).first<{ n: number }>();
    expect(left?.n).toBe(0);
  });

  it("caches links in KV with an expiry, so D1 stays the source of truth", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://cached.example" }));
    const { keys } = await env.LINKS.list({ prefix: code.slug });
    expect(keys[0]?.expiration).toBeGreaterThan(Date.now() / 1000);
    expect(keys[0]?.expiration).toBeLessThanOrEqual(Date.now() / 1000 + LINK_CACHE_TTL_SECONDS + 5);
  });
});
