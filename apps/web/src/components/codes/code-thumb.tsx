import { encode, toSvg } from "@qr-daddy/qr";
import { QrArt } from "@/components/qr-art";
import { readStyle, svgOptions } from "@/lib/qr-style";

/** A small, real render of a dynamic code in its saved style, on a white sticker face. */
export function CodeThumb({ shortUrl, style }: { shortUrl: string; style: unknown }) {
	const svg = toSvg(encode(shortUrl), { ...svgOptions(readStyle(style)), quietZone: 1 });
	return (
		<div className="size-12 shrink-0 rounded-lg border border-line-strong bg-sticker p-1">
			<QrArt svg={svg} label="" />
		</div>
	);
}
