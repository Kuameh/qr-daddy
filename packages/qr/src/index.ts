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

export { encode, DataTooLongError } from "./encode";
export { toSvg, LOGO_SIZES } from "./render/svg";
export type { Pattern, Logo, LogoSize, SvgOptions } from "./render/svg";
// toPdf lives at "@qr-daddy/qr/pdf" so pdf-lib only loads when someone asks for a PDF.
export * as payloads from "./payloads";
