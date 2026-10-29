import { LOGO_SIZES, type LogoSize, type Pattern, type SvgOptions } from "@qr-daddy/qr";
import { QR_ACCENT_EYE, QR_BACKGROUND, QR_COLOURS } from "@/lib/qr-palette";

/**
 * The look of a saved code (core's `style`), so Your codes can redraw it. The logo image itself is
 * saved beside it (core's `logo`, a small data URL); the style only says how big it is.
 */
export interface QrStyle {
	pattern: Pattern;
	foreground: string;
	eye: string;
	/** Set only when the code has a logo. */
	logoSize?: LogoSize;
}

const INK = QR_COLOURS[0].value;
const PATTERNS: Pattern[] = ["square", "rounded", "dots"];
const HEX = /^#[0-9a-f]{6}$/i;

/** The generator's choice as a style. Ink codes get cobalt eyes, the house look; coloured codes stay one colour. */
export function styleFor(pattern: Pattern, colour: string, logoSize?: LogoSize): QrStyle {
	const style: QrStyle = { pattern, foreground: colour, eye: colour === INK ? QR_ACCENT_EYE : colour };
	return logoSize ? { ...style, logoSize } : style;
}

/** A saved style, read defensively because it is stored JSON. Falls back to the default look. */
export function readStyle(value: unknown): QrStyle {
	const style = (value ?? {}) as Partial<QrStyle>;
	const pattern = PATTERNS.includes(style.pattern as Pattern) ? (style.pattern as Pattern) : "rounded";
	const foreground = typeof style.foreground === "string" && HEX.test(style.foreground) ? style.foreground : INK;
	const eye = typeof style.eye === "string" && HEX.test(style.eye) ? style.eye : styleFor(pattern, foreground).eye;
	const logoSize = typeof style.logoSize === "string" && Object.hasOwn(LOGO_SIZES, style.logoSize) ? style.logoSize : undefined;
	return logoSize ? { pattern, foreground, eye, logoSize } : { pattern, foreground, eye };
}

/** Renderer options for a style and its logo (a data URL, or null for none). */
export function svgOptions(style: QrStyle, logo: string | null = null): SvgOptions {
	return {
		pattern: style.pattern,
		foreground: style.foreground,
		background: QR_BACKGROUND,
		eye: style.eye,
		logo: logo ? { href: logo, size: style.logoSize ?? "medium" } : undefined,
	};
}
