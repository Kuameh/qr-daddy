import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { PNG } from "pngjs";
import { afterAll, describe, expect, it } from "vitest";
import { encode, type Pattern } from "../src";
import { toPdf } from "../src/render/pdf";
import { LOGO, decodeRgba } from "./helpers";

// 48×32, so the test also covers fitting a wide logo into the square hole.
const JPEG_LOGO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/wAALCAAgADABAREA/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAA/AIcAAAAAAAB//9k=";
const TEXT = "https://kofi-chops.com/menu?utm_source=poster&utm_medium=print&utm_campaign=november-specials-osu";
const PATTERNS: Pattern[] = ["square", "rounded", "dots"];
const MM_TO_PT = 72 / 25.4;

describe("PDF page", () => {
	it("is one page at the printed size, quiet zone included", async () => {
		for (const [sizeMm, expected] of [[undefined, 100], [50, 50]] as const) {
			const doc = await PDFDocument.load(await toPdf(encode(TEXT), { sizeMm }));
			expect(doc.getPageCount()).toBe(1);
			const { width, height } = doc.getPage(0).getSize();
			expect(width).toBeCloseTo(expected * MM_TO_PT, 3);
			expect(height).toBeCloseTo(expected * MM_TO_PT, 3);
		}
	});

	it("refuses logos it cannot embed instead of dropping them", async () => {
		const svgLogo = "data:image/svg+xml;base64,PHN2Zy8+";
		await expect(toPdf(encode(TEXT, { withLogo: true }), { logo: { href: svgLogo, size: "medium" } })).rejects.toThrow(/PNG or JPEG/);
	});
});

// Ghostscript rasterises the PDF the way a print RIP would; ZXing then reads the pixels.
const hasGhostscript = spawnSync("gs", ["--version"]).status === 0;

describe.skipIf(!hasGhostscript)("PDF codes scan after rasterising with Ghostscript", () => {
	const dir = mkdtempSync(join(tmpdir(), "qr-daddy-pdf-"));
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	// 100, 150 and 200 dpi turn the default 100 mm page into roughly 400, 600 and 800 px,
	// the same spread render.test.ts uses for the SVG.
	function decode(pdf: Uint8Array, name: string): string | null {
		const file = join(dir, `${name}.pdf`);
		writeFileSync(file, pdf);
		for (const dpi of [100, 150, 200]) {
			const png = execFileSync("gs", ["-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=png16m", `-r${dpi}`,
				"-dGraphicsAlphaBits=4", "-sOutputFile=-", file], { maxBuffer: 64 * 1024 * 1024 });
			const image = PNG.sync.read(png);
			const text = decodeRgba(image.data, image.width, image.height);
			if (text !== null) return text;
		}
		return null;
	}

	const logos = { none: undefined, png: LOGO, jpeg: JPEG_LOGO };
	for (const pattern of PATTERNS)
		for (const [label, href] of Object.entries(logos))
			it(`${pattern} · logo ${label}`, async () => {
				const qr = encode(TEXT, { withLogo: href !== undefined });
				const pdf = await toPdf(qr, { pattern, eye: "#2B4BFF", logo: href ? { href, size: "large" } : undefined });
				expect(decode(pdf, `${pattern}-${label}`)).toBe(TEXT);
			});
});
