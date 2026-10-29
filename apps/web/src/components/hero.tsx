import { encode, payloads, toSvg } from "@qr-daddy/qr";
import { QrArt } from "@/components/qr-art";
import { QR_ACCENT_EYE, QR_BACKGROUND, QR_COLOURS, QR_TINT } from "@/lib/qr-palette";

const ink = QR_COLOURS[0].value;
const cobalt = QR_COLOURS[1].value;

// Real, scannable samples of what the generator makes.
const STICKERS = {
	main: toSvg(encode("https://qr.ashiangmor.com"), { pattern: "dots", foreground: ink, background: QR_BACKGROUND, eye: QR_ACCENT_EYE }),
	cobalt: toSvg(encode("https://kofi-chops.com/menu"), { pattern: "dots", foreground: QR_BACKGROUND, background: cobalt, eye: QR_BACKGROUND }),
	wifi: toSvg(encode(payloads.wifi({ ssid: "Kofi Chop Bar", password: "jollof2026" })), { pattern: "rounded", foreground: ink, background: QR_TINT, quietZone: 2 }),
};

export function Hero() {
	return (
		<section className="mx-auto flex w-full max-w-page items-center gap-10 px-4 pt-6 md:px-10 md:pt-12 md:pb-6">
			<div className="flex flex-1 flex-col gap-3 md:gap-5">
				<h1 className="max-w-160 font-display text-display-lg md:text-display-xl">QR codes with main-character energy.</h1>
				<p className="max-w-140 text-base text-ink-soft md:text-lg">
					Free to make. Dots, colours, your logo in the middle. No account needed. Sign in to change a code after printing and see its scans.
				</p>
			</div>

			<div className="relative hidden h-100 w-130 shrink-0 lg:block" aria-hidden>
				<div className="absolute top-5 left-32.5 w-63 -rotate-4 rounded-3xl border-3 border-sticker-edge bg-sticker p-4.5 shadow-hard-lg motion-safe:animate-sticker-in">
					<QrArt svg={STICKERS.main} label="" />
				</div>
				<div className="absolute top-50 -left-2.5 w-55 -rotate-10 rounded-3xl border-3 border-sticker-edge bg-accent p-3.5 shadow-hard motion-safe:animate-sticker-in enter-delay-1">
					<QrArt svg={STICKERS.cobalt} label="" />
				</div>
				<div className="absolute top-55 left-80 w-47 rotate-9 rounded-3xl border-3 border-sticker-edge bg-sticker-tint p-3.5 shadow-hard motion-safe:animate-sticker-in enter-delay-2">
					<QrArt svg={STICKERS.wifi} label="" />
				</div>
			</div>
		</section>
	);
}
