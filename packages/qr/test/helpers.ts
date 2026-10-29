import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library";
import { PNG } from "pngjs";

// A solid square stands in for a logo: the worst case, since it hides every module under it.
const png = new PNG({ width: 64, height: 64 });
png.data.fill(0x2b);
export const LOGO = `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;

// ZXing is the decoder Android scanners build on. jsQR was tried first and misreads
// dot and rounded modules at high resolution, which phones read fine.
export function decodeRgba(pixels: Uint8Array, width: number, height: number, inverted = false): string | null {
	const luminance = new Uint8ClampedArray(width * height);
	for (let i = 0; i < luminance.length; i++) {
		const y = 0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2];
		luminance[i] = inverted ? 255 - y : y;
	}
	const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(luminance, width, height)));
	try {
		return new QRCodeReader().decode(bitmap).getText();
	} catch {
		return null;
	}
}
