import { MAX_LOGO_LENGTH } from "@qr-daddy/core";

// A logo has two copies. The original, as picked, is what the preview and every download use, so
// an SVG logo stays vector in the SVG file. A smaller copy, made only when a signed-in person saves
// a code, is what Your codes keeps (core stores it in D1 as a data URL of at most MAX_LOGO_LENGTH
// characters); downloads from Your codes use that copy.

/** Longest side of the copy Your codes keeps: a Large logo on a 10 cm PDF is still about 500 dpi. */
export const SAVED_LOGO_MAX_PX = 512;
/** Longest side of a logo redrawn for a PDF, which can't embed SVG or WebP. */
const PDF_LOGO_PX = 1024;

/** Thrown when even a JPEG of the logo is over MAX_LOGO_LENGTH (a large, busy photo). */
export class LogoTooDetailedError extends Error {}

function loadImage(href: string): Promise<HTMLImageElement> {
	const image = new Image();
	image.src = href;
	return image.decode().then(() => image);
}

/** Whether the browser can draw this image at all. Checked before a picked logo is added. */
export function canReadImage(href: string): Promise<boolean> {
	return loadImage(href).then(() => true, () => false);
}

/**
 * Draws a logo on a canvas with its longest side at `maxPx`. Unless `scaleUp`, smaller raster
 * images keep their size; SVGs are always drawn at `maxPx`, having no pixels of their own.
 * Transparency is kept.
 */
async function drawLogo(href: string, maxPx: number, scaleUp = false): Promise<HTMLCanvasElement> {
	const image = await loadImage(href);
	// SVGs without width and height report 0; treat them as square.
	const w = image.naturalWidth || maxPx, h = image.naturalHeight || maxPx;
	const fit = maxPx / Math.max(w, h);
	const scale = scaleUp || href.startsWith("data:image/svg+xml") ? fit : Math.min(1, fit);
	const canvas = document.createElement("canvas");
	canvas.width = Math.max(1, Math.round(w * scale));
	canvas.height = Math.max(1, Math.round(h * scale));
	canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
}

/**
 * The copy of a logo Your codes keeps: at most `maxPx` on its longest side and MAX_LOGO_LENGTH
 * characters. PNG keeps transparency; a busy logo falls back to WebP where the browser can write
 * it (Safari can't), then to JPEG on white, the background every code has. Rejects with
 * LogoTooDetailedError when none fits.
 */
export async function shrinkLogo(dataUrl: string, maxPx = SAVED_LOGO_MAX_PX): Promise<string> {
	const canvas = await drawLogo(dataUrl, maxPx);
	const png = canvas.toDataURL("image/png");
	if (png.length <= MAX_LOGO_LENGTH) return png;
	// A browser that can't write WebP hands back a PNG instead.
	const webp = canvas.toDataURL("image/webp", 0.9);
	if (webp.startsWith("data:image/webp;") && webp.length <= MAX_LOGO_LENGTH) return webp;
	const onWhite = document.createElement("canvas");
	onWhite.width = canvas.width;
	onWhite.height = canvas.height;
	const context = onWhite.getContext("2d")!;
	context.fillStyle = "white";
	context.fillRect(0, 0, onWhite.width, onWhite.height);
	context.drawImage(canvas, 0, 0);
	const jpeg = onWhite.toDataURL("image/jpeg", 0.85);
	if (jpeg.length <= MAX_LOGO_LENGTH) return jpeg;
	throw new LogoTooDetailedError();
}

let lastSaved: { source: string; copy: Promise<string | null> } | null = null;

/**
 * The copy to save for a logo, made once per logo (the last one is remembered), or null when it
 * can't be made small enough: the code is then saved without its logo, and downloads still use
 * the original.
 */
export function logoToSave(source: string): Promise<string | null> {
	if (lastSaved?.source !== source) {
		lastSaved = { source, copy: shrinkLogo(source).catch(() => null) };
	}
	return lastSaved.copy;
}

/** PDF can only embed PNG and JPEG, so SVG and WebP logos become a PNG 1024px on the long side. */
export async function pdfReadyLogo(href: string): Promise<string> {
	if (/^data:image\/(png|jpe?g)[;,]/i.test(href)) return href;
	return (await drawLogo(href, PDF_LOGO_PX, true)).toDataURL("image/png");
}
