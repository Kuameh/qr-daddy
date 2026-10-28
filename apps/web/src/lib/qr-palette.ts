// Colours a user can pick for their code. These end up inside downloaded files, so they
// are literal values rather than CSS variables. Ink and cobalt match --color-ink and
// --color-accent in globals.css; docs/DESIGN_SYSTEM.md lists the full palette.
export const QR_COLOURS = [
	{ name: "Ink", value: "#111114" },
	{ name: "Cobalt", value: "#2B4BFF" },
	{ name: "Forest", value: "#0F7B55" },
	{ name: "Clay", value: "#C2410C" },
	{ name: "Slate", value: "#6B6B72" },
] as const;

export const QR_BACKGROUND = "#FFFFFF";

// Phone cameras need clear contrast between the code and its background. Below 3:1
// (the WCAG large-graphics minimum) we warn; every preset is well above it.
export const MIN_SCAN_CONTRAST = 3;

function luminance(hex: string) {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two #RRGGBB colours, from 1 to 21. */
export function contrastRatio(a: string, b: string) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}
export const QR_ACCENT_EYE = "#2B4BFF";
export const QR_TINT = "#DDE3FF";
export const QR_PLACEHOLDER = "#E4E4DF";
