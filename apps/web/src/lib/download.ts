import type { QrCode, SvgOptions } from "@qr-daddy/qr";

// Downloads run entirely in the browser: the code never leaves the user's device.

function save(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}

export function downloadSvg(svg: string, filename: string) {
	save(new Blob([svg], { type: "image/svg+xml" }), filename);
}

/** Draws the SVG onto a canvas at `size` px square and saves it as PNG. */
export async function downloadPng(svg: string, filename: string, size = 1024) {
	const image = new Image();
	image.src = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
	await image.decode();
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	canvas.getContext("2d")!.drawImage(image, 0, 0, size, size);
	URL.revokeObjectURL(image.src);
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
	if (blob) save(blob, filename);
}

/** PDF can only embed PNG and JPEG, so SVG and WebP logos become a PNG `size` px on the long side. */
async function pdfReadyLogo(href: string, size = 1024): Promise<string> {
	if (/^data:image\/(png|jpe?g)[;,]/i.test(href)) return href;
	const image = new Image();
	image.src = href;
	await image.decode();
	// SVGs without width and height report 0; treat them as square.
	const w = image.naturalWidth || size, h = image.naturalHeight || size;
	const scale = size / Math.max(w, h);
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(w * scale);
	canvas.height = Math.round(h * scale);
	canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas.toDataURL("image/png");
}

/** Saves a print-ready vector PDF, 10 cm square. pdf-lib loads only when this runs. */
export async function downloadPdf(qr: QrCode, options: SvgOptions, filename: string) {
	const [{ toPdf }, logoHref] = await Promise.all([
		import("@qr-daddy/qr/pdf"),
		options.logo ? pdfReadyLogo(options.logo.href) : undefined,
	]);
	const logo = options.logo && logoHref ? { ...options.logo, href: logoHref } : undefined;
	const pdf = await toPdf(qr, { ...options, logo });
	save(new Blob([pdf as BlobPart], { type: "application/pdf" }), filename);
}
