import { qrcodegen } from "../encode/qrcodegen";

// Geometry shared by every output format, so the SVG and the PDF draw the same code.
// Coordinates are in modules, y pointing down, including the quiet zone.

export type Pattern = "square" | "rounded" | "dots";

export interface Logo {
	href: string;
	/** Logo width as a fraction of the code's width. Only the tested sizes are offered. */
	size: LogoSize;
}

/** Logo sizes that still scan at error-correction level HIGH (see render.test.ts). */
export const LOGO_SIZES = { small: 0.18, medium: 0.22, large: 0.26 } as const;
export type LogoSize = keyof typeof LOGO_SIZES;

export interface StyleOptions {
	pattern?: Pattern;
	foreground?: string;
	background?: string;
	/** Colour of the three corner finder "eyes". Defaults to the foreground. */
	eye?: string;
	logo?: Logo;
	/** Light border in modules. The QR standard asks for 4. */
	quietZone?: number;
}

export interface Layout {
	/** Width and height of the whole code, quiet zone included. */
	box: number;
	foreground: string;
	background: string;
	eye: string;
	/** One SVG path (no arcs larger than a module) for every data module. */
	modules: string;
	/** Per eye: the 7×7 ring (hole wound the other way, so nonzero and evenodd fill agree) and the 3×3 centre. */
	eyes: Array<{ ring: string; centre: string }>;
	/** The square the logo is fitted into, centred in the hole cleared for it. */
	logo: { href: string; at: number; width: number } | null;
}

// Rounded square as a path. Paths (not rect rx) keep rounding intact in print tools.
function roundedRect(x: number, y: number, w: number, r: number): string {
	if (r <= 0) return `M${x},${y}h${w}v${w}h${-w}z`;
	const s = w - 2 * r;
	return `M${x + r},${y}h${s}a${r},${r} 0 0 1 ${r},${r}v${s}a${r},${r} 0 0 1 ${-r},${r}h${-s}a${r},${r} 0 0 1 ${-r},${-r}v${-s}a${r},${r} 0 0 1 ${r},${-r}z`;
}

// The same square drawn anticlockwise, for holes.
function roundedRectReversed(x: number, y: number, w: number, r: number): string {
	if (r <= 0) return `M${x},${y}v${w}h${w}v${-w}z`;
	const s = w - 2 * r;
	return `M${x + r},${y}a${r},${r} 0 0 0 ${-r},${r}v${s}a${r},${r} 0 0 0 ${r},${r}h${s}a${r},${r} 0 0 0 ${r},${-r}v${-s}a${r},${r} 0 0 0 ${-r},${-r}z`;
}

const EYE_RADII: Record<Pattern, { outer: number; inner: number }> = {
	square: { outer: 0, inner: 0 },
	rounded: { outer: 2, inner: 0.9 },
	dots: { outer: 3.5, inner: 1.5 },
};

export function layout(qr: qrcodegen.QrCode, options: StyleOptions = {}): Layout {
	const { pattern = "square", foreground = "#111114", background = "#FFFFFF", logo, quietZone = 4 } = options;
	const n = qr.size;
	const box = n + quietZone * 2;
	const logoModules = logo ? Math.ceil(n * LOGO_SIZES[logo.size]) | 1 : 0; // odd, so it centres on a module
	const logoStart = (n - logoModules) / 2;

	const inEye = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
	const inLogo = (x: number, y: number) =>
		logoModules > 0 && x >= logoStart && x < logoStart + logoModules && y >= logoStart && y < logoStart + logoModules;

	let modules = "";
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) {
			if (!qr.getModule(x, y) || inEye(x, y) || inLogo(x, y)) continue;
			const X = x + quietZone, Y = y + quietZone;
			if (pattern === "dots") modules += `M${X + 0.08},${Y + 0.5}a0.42,0.42 0 1 0 0.84,0a0.42,0.42 0 1 0 -0.84,0z`;
			else if (pattern === "rounded") modules += roundedRect(X + 0.06, Y + 0.06, 0.88, 0.3);
			// Square modules overlap by a hair so anti-aliasing doesn't draw seams between them.
			else modules += `M${X},${Y}h1.02v1.02h-1.02z`;
		}
	}

	const { outer, inner } = EYE_RADII[pattern];
	const eyes = [[0, 0], [n - 7, 0], [0, n - 7]].map(([ex, ey]) => {
		const X = ex + quietZone, Y = ey + quietZone;
		return {
			ring: roundedRect(X, Y, 7, outer) + roundedRectReversed(X + 1, Y + 1, 5, Math.max(outer - 1, 0)),
			centre: roundedRect(X + 2, Y + 2, 3, inner),
		};
	});

	const pad = 0.5;
	const logoBox = logo ? { href: logo.href, at: logoStart + quietZone + pad, width: logoModules - pad * 2 } : null;

	return { box, foreground, background, eye: options.eye ?? foreground, modules, eyes, logo: logoBox };
}
