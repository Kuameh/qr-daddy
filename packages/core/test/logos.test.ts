import { describe, expect, it } from "vitest";
import { createCode, deleteCode, getCode, listCodes, updateCode, validateLogo, MAX_LOGO_LENGTH } from "../src";
import { signIn, testDeps, unwrap } from "./helpers";

// A 1×1 transparent PNG, and the same pixel as JPEG and WebP prefixes (validation doesn't decode).
const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const OTHER_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U";
const WEBP = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
const BAD_LOGO = "We can't keep that logo. Use a PNG, JPG or WebP image under 140 KB.";
const WIFI = "WIFI:T:WPA;S:Kofi Chop Bar;P:jollof;;";

describe("validateLogo", () => {
  it("accepts base64 PNG, JPEG and WebP data URLs", () => {
    for (const logo of [PNG, JPEG, WEBP]) expect(validateLogo(logo)).toEqual({ ok: true, value: logo });
  });

  it("treats null, undefined and blank as no logo", () => {
    for (const logo of [null, undefined, ""]) expect(validateLogo(logo)).toEqual({ ok: true, value: null });
  });

  it("refuses anything that could break out of the SVG it's drawn into", () => {
    const refused = [
      "data:image/svg+xml;base64,PHN2Zy8+",
      "data:image/svg+xml,<svg onload=alert(1)/>",
      "javascript:alert(1)",
      "https://example.com/logo.png",
      'data:image/png;base64,iVBORw0KGgo"/><script>alert(1)</script>',
      "data:image/png;base64,iVBORw0KGgo>",
      "data:image/png;base64,iVBORw0KGgo AAAA",
      "data:image/png,iVBORw0KGgo",
      "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      `${PNG}\n`,
    ];
    for (const logo of refused) expect(validateLogo(logo)).toEqual({ ok: false, code: "bad_logo", message: BAD_LOGO });
  });

  it(`allows up to ${MAX_LOGO_LENGTH.toLocaleString()} characters`, () => {
    const prefix = "data:image/png;base64,";
    const atLimit = prefix + "A".repeat(MAX_LOGO_LENGTH - prefix.length);
    expect(validateLogo(atLimit).ok).toBe(true);
    expect(validateLogo(`${atLimit}A`)).toMatchObject({ ok: false, code: "bad_logo" });
  });
});

describe("saved logos", () => {
  it("keeps a static code's logo: the last download sets, replaces or clears it", async () => {
    const { deps, advance } = testDeps();
    const user = await signIn(deps);
    const first = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, logo: PNG }));
    expect(first.logo).toBe(PNG);
    expect(await getCode(deps, user.id, first.id)).toMatchObject({ logo: PNG });

    advance(1000);
    const replaced = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, logo: OTHER_PNG }));
    expect(replaced).toMatchObject({ id: first.id, logo: OTHER_PNG });

    advance(1000);
    const cleared = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI }));
    expect(cleared).toMatchObject({ id: first.id, logo: null });
    expect(await getCode(deps, user.id, first.id)).toMatchObject({ logo: null });
    expect(await listCodes(deps, user.id)).toHaveLength(1);
  });

  it("keeps a dynamic code's logo, and changes or clears it with updateCode", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { destination: "https://kofi.example/menu", logo: WEBP, style: { logoSize: "large" } }));
    expect(code).toMatchObject({ kind: "dynamic", logo: WEBP, style: { logoSize: "large" } });

    expect(unwrap(await updateCode(deps, user.id, code.id, { logo: JPEG }))).toMatchObject({ logo: JPEG });
    // Leaving the logo out of a patch keeps it.
    expect(unwrap(await updateCode(deps, user.id, code.id, { title: "Menu" }))).toMatchObject({ logo: JPEG, title: "Menu" });
    expect(unwrap(await updateCode(deps, user.id, code.id, { logo: null }))).toMatchObject({ logo: null });
    expect(unwrap(await updateCode(deps, user.id, code.id, { logo: PNG }))).toMatchObject({ logo: PNG });
    expect(unwrap(await updateCode(deps, user.id, code.id, { logo: "" }))).toMatchObject({ logo: null });
  });

  it("refuses a bad logo without saving anything", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const before = (await listCodes(deps, user.id)).length;
    const svg = "data:image/svg+xml;base64,PHN2Zy8+";
    const made = await createCode(deps, user.id, { destination: "https://kofi.example", logo: svg });
    expect(made).toEqual({ ok: false, code: "bad_logo", message: BAD_LOGO });
    const staticMade = await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, logo: svg });
    expect(staticMade.ok || staticMade.code).toBe("bad_logo");
    expect(await listCodes(deps, user.id)).toHaveLength(before);

    const code = unwrap(await createCode(deps, user.id, { destination: "https://kofi.example", logo: PNG }));
    const update = await updateCode(deps, user.id, code.id, { logo: "javascript:alert(1)", title: "Changed" });
    expect(update.ok || update.code).toBe("bad_logo");
    expect(await getCode(deps, user.id, code.id)).toMatchObject({ logo: PNG, title: null });
  });

  it("checks that static content still fits with a logo, which needs more error correction", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    // Fits at the plain level (2,331 bytes), not at the logo level (1,273 bytes).
    const content = "x".repeat(2000);
    const withLogo = await createCode(deps, user.id, { kind: "static", contentType: "contact", destination: content, logo: PNG });
    expect(withLogo).toEqual({
      ok: false,
      code: "bad_destination",
      message: "That's too much to fit in one QR code with a logo. Make it shorter or remove the logo.",
    });
    const plain = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "contact", destination: content }));
    const addLogo = await updateCode(deps, user.id, plain.id, { logo: PNG });
    expect(addLogo.ok || addLogo.code).toBe("bad_destination");
    expect(await getCode(deps, user.id, plain.id)).toMatchObject({ logo: null });
  });

  it("keeps the stored logo when a patch leaves it out", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const dynamic = unwrap(await createCode(deps, user.id, { destination: "https://kofi.example/keep", logo: PNG }));
    expect(unwrap(await updateCode(deps, user.id, dynamic.id, { style: { pattern: "dots" } }))).toMatchObject({ logo: PNG, style: { pattern: "dots" } });
    expect(unwrap(await updateCode(deps, user.id, dynamic.id, { destination: "https://kofi.example/moved" }))).toMatchObject({ logo: PNG });
    const fixed = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, logo: WEBP }));
    expect(unwrap(await updateCode(deps, user.id, fixed.id, { title: "Shop", style: { pattern: "square" } }))).toMatchObject({ logo: WEBP });
    expect(await getCode(deps, user.id, fixed.id)).toMatchObject({ logo: WEBP, title: "Shop" });
  });

  it("still answers fixed_content for a static code, with or without a logo in the patch", async () => {
    const { deps } = testDeps();
    const user = await signIn(deps);
    const code = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "link", destination: "https://kofi.example/fixed", logo: PNG }));
    for (const patch of [{ destination: "https://elsewhere.example" }, { destination: "https://elsewhere.example", logo: JPEG }, { destination: "WIFI:S:x;;", logo: null }]) {
      const moved = await updateCode(deps, user.id, code.id, patch);
      expect(moved.ok || moved.code).toBe("fixed_content");
    }
    expect(await getCode(deps, user.id, code.id)).toMatchObject({ destination: "https://kofi.example/fixed", logo: PNG });
    // Adding a logo to a deleted code is not_found, not a content check.
    const gone = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "sms", destination: "SMSTO:0244000000" }));
    unwrap(await deleteCode(deps, user.id, gone.id));
    const late = await updateCode(deps, user.id, gone.id, { logo: PNG });
    expect(late.ok || late.code).toBe("not_found");
  });

  it("lists whether a code has a logo, without loading the logo", async () => {
    const { deps, advance } = testDeps();
    const user = await signIn(deps);
    const plain = unwrap(await createCode(deps, user.id, { destination: "https://kofi.example/plain" }));
    advance(1000);
    const branded = unwrap(await createCode(deps, user.id, { kind: "static", contentType: "wifi", destination: WIFI, logo: PNG }));

    const list = await listCodes(deps, user.id);
    expect(list.map((c) => [c.id, c.hasLogo])).toEqual([
      [branded.id, true],
      [plain.id, false],
    ]);
    for (const code of list) expect(code).not.toHaveProperty("logo");
  });

  it("never shows or changes another person's logo", async () => {
    const { deps } = testDeps();
    const owner = await signIn(deps);
    const other = await signIn(deps);
    const mine = unwrap(await createCode(deps, owner.id, { destination: "https://kofi.example", logo: PNG }));

    expect(await getCode(deps, other.id, mine.id)).toBeNull();
    for (const logo of [OTHER_PNG, null]) {
      const update = await updateCode(deps, other.id, mine.id, { logo });
      expect(update.ok || update.code).toBe("not_found");
    }
    expect(await listCodes(deps, other.id)).toEqual([]);
    expect(await getCode(deps, owner.id, mine.id)).toMatchObject({ logo: PNG });
  });
});
