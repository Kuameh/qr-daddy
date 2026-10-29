import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createCode, deleteCode, getCode, listCodes, recordScan, scanSummary, updateCode } from "../src";
import { signIn, START, testDeps, unwrap } from "./helpers";

const WIFI = "WIFI:T:WPA;S:Kofi Chop Bar;P:jollof\;rice;;";

describe("static codes", () => {
  it("saves the exact QR text with no slug and nothing in KV", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const kvBefore = (await env.LINKS.list()).keys.length;

    const code = unwrap(
      await createCode(deps, user.id, {
        kind: "static",
        contentType: "wifi",
        destination: WIFI,
        title: "Kofi Chop Bar",
        style: { pattern: "dots" },
      }),
    );
    expect(code).toMatchObject({
      kind: "static",
      contentType: "wifi",
      slug: null,
      shortUrl: null,
      destination: WIFI,
      title: "Kofi Chop Bar",
      style: { pattern: "dots" },
    });
    expect((await env.LINKS.list()).keys.length).toBe(kvBefore);
    expect(await getCode(deps, user.id, code.id)).toEqual(code);
    expect(await scanSummary(deps, user.id, code.id)).toBeNull();
  });

  it("finds the same code when the same content is saved again, with the new style", async () => {
    const { deps, advance } = testDeps();
    const user = await signIn(deps);
    const first = unwrap(
      await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, title: "Kofi", style: { pattern: "dots" } }),
    );
    unwrap(await updateCode(deps, user.id, first.id, { title: "Shop Wi-Fi" }));

    advance(1000);
    const again = unwrap(
      await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, title: "Kofi", style: { pattern: "square" } }),
    );
    expect(again.id).toBe(first.id);
    expect(again).toMatchObject({ style: { pattern: "square" }, title: "Shop Wi-Fi", createdAt: START, updatedAt: START + 1000 });
    expect((await listCodes(deps, user.id)).map((c) => c.id)).toEqual([first.id]);

    // Two downloads at once still make one code: the unique index decides, not a read first.
    const [a, b] = await Promise.all([
      createCode(deps, user.id, { kind: "static", contentType: "sms", destination: "SMSTO:0244123456" }),
      createCode(deps, user.id, { kind: "static", contentType: "sms", destination: "SMSTO:0244123456" }),
    ]);
    expect(unwrap(a).id).toBe(unwrap(b).id);
    expect(await listCodes(deps, user.id)).toHaveLength(2);
  });

  it("keeps each person's static codes apart", async () => {
    const { deps } = testDeps();
    const owner = await signIn(deps);
    const other = await signIn(deps);
    const mine = unwrap(await createCode(deps, owner.id, { kind: "static", contentType: "wifi", destination: WIFI }));
    const theirs = unwrap(await createCode(deps, other.id, { kind: "static", contentType: "wifi", destination: WIFI }));
    expect(theirs.id).not.toBe(mine.id);

    expect(await getCode(deps, other.id, mine.id)).toBeNull();
    const update = await updateCode(deps, other.id, mine.id, { style: { pattern: "dots" } });
    expect(update.ok || update.code).toBe("not_found");
    const removal = await deleteCode(deps, other.id, mine.id);
    expect(removal.ok || removal.code).toBe("not_found");
    expect((await listCodes(deps, owner.id)).map((c) => c.id)).toEqual([mine.id]);
  });

  it("lets the title and style change, never the content", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "link", destination: "https://kofi.example" }));

    const restyled = unwrap(await updateCode(deps, user.id, code.id, { title: "Menu", style: { pattern: "dots" } }));
    expect(restyled).toMatchObject({ title: "Menu", style: { pattern: "dots" }, destination: "https://kofi.example" });

    const moved = await updateCode(deps, user.id, code.id, { destination: "https://elsewhere.example", title: "Moved" });
    expect(moved.ok || moved.code).toBe("fixed_content");
    // A non-link value gets the same answer, not "enter a link".
    const rewritten = await updateCode(deps, user.id, code.id, { destination: "WIFI:S:x;;" });
    expect(rewritten.ok || rewritten.code).toBe("fixed_content");
    expect(await getCode(deps, user.id, code.id)).toMatchObject({ destination: "https://kofi.example", title: "Menu" });
  });

  it("checks static content", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const empty = await createCode(deps, user.id, { kind: "static", contentType: "sms", destination: "  " });
    expect(empty.ok || empty.code).toBe("bad_destination");
    // The limit is what a QR code can hold, not a character count: 2,331 bytes of text at the
    // error correction Your codes draws with, and accented letters take two bytes each.
    const tooMuch = "That's too much to fit in one QR code. Make it shorter.";
    const long = await createCode(deps, user.id, { kind: "static", contentType: "contact", destination: "x".repeat(2332) });
    expect(long.ok || long.message).toBe(tooMuch);
    const accented = await createCode(deps, user.id, { kind: "static", contentType: "contact", destination: "é".repeat(1200) });
    expect(accented.ok || accented.message).toBe(tooMuch);
    unwrap(await createCode(deps, user.id, { kind: "static", contentType: "contact", destination: "x".repeat(2331) }));
    // Static codes aren't links, so no URL check: an email code is a mailto: string.
    unwrap(await createCode(deps, user.id, { kind: "static", contentType: "email", destination: "mailto:ama@example.com" }));

    const unknown = await createCode(deps, user.id, { kind: "static", contentType: "momo" as never, destination: "x" });
    expect(unknown.ok || unknown.code).toBe("bad_content_type");
    const dynamicWifi = await createCode(deps, user.id, { kind: "dynamic", contentType: "wifi", destination: "https://a.example" });
    expect(dynamicWifi.ok || dynamicWifi.code).toBe("bad_content_type");
  });

  it("deletes a static code, and the same content then saves as a new one", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI }));
    unwrap(await deleteCode(deps, user.id, code.id));
    expect(await getCode(deps, user.id, code.id)).toBeNull();
    expect(await listCodes(deps, user.id)).toEqual([]);

    const fresh = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI }));
    expect(fresh.id).not.toBe(code.id);
  });

  it("lists both kinds newest first, with scans only on dynamic codes", async () => {
    const { deps, advance } = testDeps();
    const user = await signIn(deps);
    const dynamic = unwrap(await createCode(deps, user.id, { destination: "https://kofi.example/menu" }));
    await recordScan(deps, { codeId: dynamic.id, device: "mobile" });
    advance(1000);
    const wifi = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI }));
    advance(1000);
    const link = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "link", destination: "https://kofi.example/menu" }));

    const list = await listCodes(deps, user.id);
    expect(list.map((c) => [c.id, c.kind, c.contentType, c.scansLast7Days])).toEqual([
      [link.id, "static", "link", 0],
      [wifi.id, "static", "wifi", 0],
      [dynamic.id, "dynamic", "link", 1],
    ]);
    expect(list[2].shortUrl).toBe(dynamic.shortUrl);
  });
});

describe("migration 0003", () => {
  it("keeps existing dynamic codes and their scans", async () => {
    const db = env.MIGRATION_DB;
    const all = env.TEST_MIGRATIONS;
    await applyD1Migrations(db, all.slice(0, all.findIndex((m) => m.name.startsWith("0003"))));
    await db.batch([
      db.prepare("INSERT INTO users (id, email, created_at) VALUES ('u1', 'ama@example.com', 1)"),
      db.prepare(
        `INSERT INTO codes (id, user_id, slug, destination, title, style_json, created_at, updated_at, deleted_at)
         VALUES ('c1', 'u1', 'abc123', 'https://kofi.example', 'Menu', '{"pattern":"dots"}', 1, 2, NULL),
                ('c2', 'u1', 'gone99', 'https://old.example', NULL, NULL, 1, 3, 3)`,
      ),
      db.prepare("INSERT INTO scans (code_id, scanned_at, country) VALUES ('c1', 5, 'GH')"),
    ]);

    await applyD1Migrations(db, all);

    const rows = await db.prepare("SELECT * FROM codes ORDER BY id").all();
    expect(rows.results).toEqual([
      { id: "c1", user_id: "u1", kind: "dynamic", content_type: "link", slug: "abc123", destination: "https://kofi.example", title: "Menu", style_json: '{"pattern":"dots"}', created_at: 1, updated_at: 2, deleted_at: null, logo: null },
      { id: "c2", user_id: "u1", kind: "dynamic", content_type: "link", slug: "gone99", destination: "https://old.example", title: null, style_json: null, created_at: 1, updated_at: 3, deleted_at: 3, logo: null },
    ]);
    const scans = await db.prepare("SELECT code_id, country FROM scans").all();
    expect(scans.results).toEqual([{ code_id: "c1", country: "GH" }]);
    expect((await db.prepare("PRAGMA foreign_key_check").all()).results).toEqual([]);

    // Slugs stay unique, and the database refuses a dynamic code without one.
    await expect(
      db.prepare("INSERT INTO codes (id, user_id, slug, destination, created_at, updated_at) VALUES ('c3', 'u1', 'abc123', 'https://x.example', 1, 1)").run(),
    ).rejects.toThrow(/UNIQUE/);
    await expect(
      db.prepare("INSERT INTO codes (id, user_id, destination, created_at, updated_at) VALUES ('c4', 'u1', 'https://x.example', 1, 1)").run(),
    ).rejects.toThrow(/CHECK/);
    const indexes = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'codes' AND sql IS NOT NULL ORDER BY name").all();
    expect(indexes.results).toEqual([{ name: "codes_user_created" }, { name: "codes_user_static_destination" }]);
  });
});
