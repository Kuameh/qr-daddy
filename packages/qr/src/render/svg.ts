import { qrcodegen } from "../encode/qrcodegen";
import { layout, type StyleOptions } from "./layout";

export { LOGO_SIZES } from "./layout";
export type { Logo, LogoSize, Pattern } from "./layout";

export interface SvgOptions extends StyleOptions {
	/** Output width and height in px. Omit for a size-less SVG that scales to its box. */
	size?: number;
}

const ATTRIBUTE_ESCAPES: Record<string, string> = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };

/** Escapes a value for a double-quoted XML attribute. The logo href comes from the user. */
function attribute(value: string): string {
	return value.replace(/[&"<>]/g, (c) => ATTRIBUTE_ESCAPES[c]);
}

export function toSvg(qr: qrcodegen.QrCode, options: SvgOptions = {}): string {
	const { box, foreground, background, eye, modules, eyes, logo } = layout(qr, options);

	const eyeMarkup = eyes.map(({ ring, centre }) => `<path fill-rule="evenodd" d="${ring}"/><path d="${centre}"/>`).join("");
	const logoMarkup = logo
		? `<image href="${attribute(logo.href)}" x="${logo.at}" y="${logo.at}" width="${logo.width}" height="${logo.width}" preserveAspectRatio="xMidYMid meet"/>`
		: "";

	const dims = options.size ? ` width="${options.size}" height="${options.size}"` : "";
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${box} ${box}"${dims} shape-rendering="geometricPrecision">`
		+ `<rect width="${box}" height="${box}" fill="${background}"/>`
		+ `<path fill="${foreground}" d="${modules}"/>`
		+ `<g fill="${eye}">${eyeMarkup}</g>`
		+ logoMarkup
		+ `</svg>`;
}
