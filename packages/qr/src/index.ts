import { qrcodegen } from "./encode/qrcodegen";

// The encoder is vendored from nayuki/QR-Code-generator with only `export` added,
// so upstream fixes merge cleanly. These aliases are the public surface.
export { qrcodegen };
export const QrCode = qrcodegen.QrCode;
export type QrCode = qrcodegen.QrCode;
export const QrSegment = qrcodegen.QrSegment;
export type QrSegment = qrcodegen.QrSegment;
export const Ecc = qrcodegen.QrCode.Ecc;
export type Ecc = qrcodegen.QrCode.Ecc;
