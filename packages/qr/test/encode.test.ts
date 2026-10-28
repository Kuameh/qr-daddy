import { describe, expect, it } from "vitest";
import { Ecc, QrCode, QrSegment } from "../src";
import fixtures from "./upstream-fixtures.json";

// Fixtures were generated from the unmodified upstream encoder. Every case must match bit for bit.
const ECC = { LOW: Ecc.LOW, MEDIUM: Ecc.MEDIUM, QUARTILE: Ecc.QUARTILE, HIGH: Ecc.HIGH } as const;
type Fixture = (typeof fixtures)[number] & { ecc: keyof typeof ECC };

function rows(qr: QrCode): string[] {
	return Array.from({ length: qr.size }, (_, y) =>
		Array.from({ length: qr.size }, (_, x) => (qr.getModule(x, y) ? "1" : "0")).join(""));
}

function encode(f: Fixture): QrCode {
	switch (f.kind) {
		case "text": return QrCode.encodeText(f.text!, ECC[f.ecc]);
		case "mask": return QrCode.encodeSegments(QrSegment.makeSegments(f.text!), ECC[f.ecc], 1, 40, f.forcedMask!, false);
		case "binary": return QrCode.encodeBinary(f.bytes!, ECC[f.ecc]);
		case "eci": return QrCode.encodeSegments([QrSegment.makeEci(26), QrSegment.makeBytes([0xE4, 0xBD, 0xA0])], ECC[f.ecc], 5, 10, -1, true);
		default: throw new Error(`Unknown fixture kind ${f.kind}`);
	}
}

describe("encoder matches upstream", () => {
	it.each((fixtures as Fixture[]).map((f, i) => [`${i} ${f.kind} ${f.ecc} ${JSON.stringify(f.text ?? "").slice(0, 30)}`, f] as const))(
		"%s", (_, f) => {
			const qr = encode(f);
			expect(qr.version).toBe(f.version);
			expect(qr.mask).toBe(f.mask);
			expect(rows(qr)).toEqual(f.rows);
		});
});
