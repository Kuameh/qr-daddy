import { encode, toSvg } from "@qr-daddy/qr";
import { QrArt } from "@/components/qr-art";
import { readStyle, svgOptions } from "@/lib/qr-style";

/**
 * A small, real render of a saved code in its style, on a white sticker face. `text` is what it
 * encodes. The logo isn't loaded in the list; a code with one is encoded the way it was printed
 * (error correction HIGH), so the pattern matches the print.
 */
export function CodeThumb({ text, style, hasLogo }: { text: string; style: unknown; hasLogo: boolean }) {
	const svg = toSvg(encode(text, { withLogo: hasLogo }), { ...svgOptions(readStyle(style)), quietZone: 1 });
	return (
		<div className="size-12 shrink-0 rounded-lg border border-line-strong bg-sticker p-1">
			<QrArt svg={svg} label="" />
		</div>
	);
}
