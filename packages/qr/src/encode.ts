import { qrcodegen } from "./encode/qrcodegen";

export class DataTooLongError extends Error {
	constructor() { super("Data too long for a QR code"); this.name = "DataTooLongError"; }
}

/**
 * Encodes text for display. A logo hides modules, so codes with a logo use error
 * correction HIGH (about 30% recoverable); plain codes use MEDIUM, and the encoder
 * still raises the level when it fits in the same size.
 */
export function encode(text: string, { withLogo = false } = {}): qrcodegen.QrCode {
	const ecc = withLogo ? qrcodegen.QrCode.Ecc.HIGH : qrcodegen.QrCode.Ecc.MEDIUM;
	try {
		return qrcodegen.QrCode.encodeText(text, ecc);
	} catch (err) {
		if (err instanceof RangeError && err.message === "Data too long") throw new DataTooLongError();
		throw err;
	}
}
