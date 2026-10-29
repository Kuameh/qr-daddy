import { Resvg } from "@resvg/resvg-js";
import { describe, expect, it } from "vitest";
import { DataTooLongError, LOGO_SIZES, encode, payloads, toSvg, type LogoSize, type Pattern } from "../src";
import { LOGO, decodeRgba } from "./helpers";

function decodeAt(svg: string, width: number, inverted: boolean): string | null {
	const image = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render();
	return decodeRgba(image.pixels, image.width, image.height, inverted); // pixels copies the buffer on each read
}

// A phone sees many frames at shifting scales; ZXing fails some exact scales even on
// unstyled codes (a version 8 code fails at 520–600px), so a code passes when any of a
// few sizes reads back. Inverted reads cover scanners that support light-on-dark codes.
function decode(svg: string, { widths = [400, 600, 800], inverted = false } = {}): string | null {
	for (const width of widths) {
		const text = decodeAt(svg, width, inverted);
		if (text !== null) return text;
	}
	return null;
}

const TEXTS = {
	link: "https://q.ashiangmor.com/d4dy",
	"long link": "https://kofi-chops.com/menu?utm_source=poster&utm_medium=print&utm_campaign=november-specials-osu",
	contact: payloads.contact({ name: "Ama Mensah", phone: "+233 24 412 3456", email: "ama@kofi-chops.com", org: "Kofi's Chop Bar" }),
};
const PATTERNS: Pattern[] = ["square", "rounded", "dots"];
const LOGOS: Array<LogoSize | null> = [null, ...(Object.keys(LOGO_SIZES) as LogoSize[])];

describe("rendered codes scan", () => {
	for (const [label, text] of Object.entries(TEXTS))
		for (const pattern of PATTERNS)
			for (const logo of LOGOS)
				it(`${label} · ${pattern} · logo ${logo ?? "none"}`, () => {
					const qr = encode(text, { withLogo: logo !== null });
					const svg = toSvg(qr, { pattern, eye: "#2B4BFF", logo: logo ? { href: LOGO, size: logo } : undefined });
					expect(decode(svg)).toBe(text);
				});

	it("scans small, as on a phone screen far away", () => {
		expect(decode(toSvg(encode(TEXTS.link), { pattern: "dots" }), { widths: [160] })).toBe(TEXTS.link);
	});

	it("scans light-on-dark colours", () => {
		const text = TEXTS.link;
		const svg = toSvg(encode(text), { pattern: "dots", foreground: "#FFFFFF", background: "#2B4BFF", eye: "#FFFFFF" });
		expect(decode(svg, { inverted: true })).toBe(text);
	});

	it("reports data that cannot fit", () => {
		expect(() => encode("x".repeat(3000), { withLogo: true })).toThrow(DataTooLongError);
	});
});
