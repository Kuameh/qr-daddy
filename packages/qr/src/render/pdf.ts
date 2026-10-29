import { PDFDocument, rgb, type PDFImage, type PDFPage } from "pdf-lib";
import { qrcodegen } from "../encode/qrcodegen";
import { layout, type StyleOptions } from "./layout";

export interface PdfOptions extends StyleOptions {
	/** Printed width and height of the page in millimetres, quiet zone included. */
	sizeMm?: number;
}

const POINTS_PER_MM = 72 / 25.4;

function colour(value: string) {
	const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
	if (!hex) throw new Error(`PDF colours must be hex (#RGB or #RRGGBB), got "${value}".`);
	const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
	const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
	return rgb(r, g, b);
}

// PDF has no SVG or WebP images. Callers in a browser rasterise those to PNG first
// (see apps/web/src/lib/download.ts); this package stays free of DOM APIs.
async function embedLogo(pdf: PDFDocument, href: string): Promise<PDFImage> {
	if (/^data:image\/png[;,]/i.test(href)) return pdf.embedPng(href);
	if (/^data:image\/jpe?g[;,]/i.test(href)) return pdf.embedJpg(href);
	throw new Error("PDF logos must be PNG or JPEG data URLs. Convert other images to PNG first.");
}

/**
 * Draws the code as a single-page vector PDF, the same geometry as `toSvg`.
 * The page is the code itself: `sizeMm` square (default 100 mm), quiet zone included.
 */
export async function toPdf(qr: qrcodegen.QrCode, options: PdfOptions = {}): Promise<Uint8Array> {
	const { box, foreground, background, eye, modules, eyes, logo } = layout(qr, options);
	const side = (options.sizeMm ?? 100) * POINTS_PER_MM;
	const scale = side / box;

	const pdf = await PDFDocument.create();
	pdf.setTitle("QR code");
	pdf.setCreator("QR Daddy");
	pdf.setProducer("QR Daddy");
	const page: PDFPage = pdf.addPage([side, side]);

	// drawSvgPath takes the path's top-left corner and flips y, so (0, side) is the page's top-left.
	const draw = (path: string, fill: string) => path && page.drawSvgPath(path, { x: 0, y: side, scale, color: colour(fill) });
	if (background !== "transparent") page.drawRectangle({ x: 0, y: 0, width: side, height: side, color: colour(background) });
	draw(modules, foreground);
	for (const { ring, centre } of eyes) {
		draw(ring, eye);
		draw(centre, eye);
	}

	if (logo) {
		const image = await embedLogo(pdf, logo.href);
		// Fit inside the logo square, centred, like preserveAspectRatio="xMidYMid meet".
		const fit = Math.min(logo.width / image.width, logo.width / image.height);
		const w = image.width * fit, h = image.height * fit;
		const left = logo.at + (logo.width - w) / 2, top = logo.at + (logo.width - h) / 2;
		page.drawImage(image, { x: left * scale, y: side - (top + h) * scale, width: w * scale, height: h * scale });
	}

	return pdf.save();
}
