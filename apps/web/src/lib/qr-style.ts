import type { Pattern, SvgOptions } from "@qr-daddy/qr";
import { QR_ACCENT_EYE, QR_BACKGROUND, QR_COLOURS } from "@/lib/qr-palette";

/**
 * The look of a dynamic code, saved with it (core's `style`) so Your codes can redraw it.
 * The logo isn't saved: logo files are far bigger than the 10,000-character style limit.
 */
export interface QrStyle {
	pattern: Pattern;
	foreground: string;
	eye: string;
}

const INK = QR_COLOURS[0].value;
const PATTERNS: Pattern[] = ["square", "rounded", "dots"];
const HEX = /^#[0-9a-f]{6}$/i;

/** The generator's choice as a style. Ink codes get cobalt eyes, the house look; coloured codes stay one colour. */
export function styleFor(pattern: Pattern, colour: string): QrStyle {
	return { pattern, foreground: colour, eye: colour === INK ? QR_ACCENT_EYE : colour };
}

/** A saved style, read defensively because it is stored JSON. Falls back to the default look. */
export function readStyle(value: unknown): QrStyle {
	const style = (value ?? {}) as Partial<QrStyle>;
	const pattern = PATTERNS.includes(style.pattern as Pattern) ? (style.pattern as Pattern) : "rounded";
	const foreground = typeof style.foreground === "string" && HEX.test(style.foreground) ? style.foreground : INK;
	const eye = typeof style.eye === "string" && HEX.test(style.eye) ? style.eye : styleFor(pattern, foreground).eye;
	return { pattern, foreground, eye };
}

export function svgOptions(style: QrStyle): SvgOptions {
	return { pattern: style.pattern, foreground: style.foreground, background: QR_BACKGROUND, eye: style.eye };
}
