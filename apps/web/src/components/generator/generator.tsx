"use client";

import { ArrowLeft, UploadSimple, WarningCircle, X } from "@phosphor-icons/react";
import { DataTooLongError, LOGO_SIZES, encode, toSvg, type LogoSize, type Pattern, type SvgOptions } from "@qr-daddy/qr";
import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { DevModeBadge } from "@/components/dev-mode-badge";
import { QrArt } from "@/components/qr-art";
import { DEV_MODE } from "@/lib/dev-mode";
import { downloadPng, downloadSvg } from "@/lib/download";
import { MIN_SCAN_CONTRAST, QR_ACCENT_EYE, QR_BACKGROUND, QR_COLOURS, QR_PLACEHOLDER, contrastRatio } from "@/lib/qr-palette";
import { CONTENT_TYPES, EMPTY_FIELDS, contentText, type ContentType, type Fields } from "./content";
import { ContentFields } from "./fields";

const PATTERNS: Array<{ value: Pattern; label: string; glyph: string }> = [
	{ value: "square", label: "Square", glyph: "rounded-none" },
	{ value: "rounded", label: "Rounded", glyph: "rounded-md" },
	{ value: "dots", label: "Dots", glyph: "rounded-full" },
];

const LOGO_LABELS: Record<LogoSize, string> = { small: "Small", medium: "Medium", large: "Large" };
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const INK = QR_COLOURS[0].value;

const PLACEHOLDER_SVG = toSvg(encode("https://qr.ashiangmor.com"), { pattern: "rounded", foreground: QR_PLACEHOLDER, background: "transparent" });

type Result =
	| { kind: "empty" }
	| { kind: "too-long" }
	| { kind: "ready"; svg: string; file: string };

function StepHeading({ n, children }: { n: number; children: ReactNode }) {
	return (
		<h2 className="flex items-center gap-2.5">
			<span className="flex size-7 items-center justify-center rounded-full bg-ink font-display text-sm text-surface">{n}</span>
			<span className="font-display text-step">{children}</span>
		</h2>
	);
}

const chip = (active: boolean) =>
	`min-h-11 rounded-full px-3.5 text-sm md:min-h-9 md:px-3 ${active ? "bg-ink text-surface" : "bg-chip text-ink"}`;

const primaryButton =
	"flex h-13 items-center justify-center rounded-xl border-2 border-ink bg-accent px-4.5 text-base font-medium text-surface shadow-hard-sm disabled:opacity-40 disabled:shadow-none md:h-11 md:text-sm";
const secondaryButton =
	"flex h-13 items-center justify-center rounded-xl border-2 border-ink bg-surface px-4 text-base font-medium disabled:opacity-40 md:h-11 md:text-sm";

export function Generator() {
	const [type, setType] = useState<ContentType>("link");
	const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
	const [pattern, setPattern] = useState<Pattern>("rounded");
	const [colour, setColour] = useState<string>(INK);
	const [logo, setLogo] = useState<{ href: string; size: LogoSize } | null>(null);
	const [logoError, setLogoError] = useState<string | null>(null);
	const [dynamic, setDynamic] = useState(false);
	const [step, setStep] = useState(1);

	const text = useDeferredValue(contentText(type, fields));

	const result = useMemo<Result>(() => {
		if (!text) return { kind: "empty" };
		try {
			const qr = encode(text, { withLogo: logo !== null });
			const options: SvgOptions = {
				pattern,
				foreground: colour,
				background: QR_BACKGROUND,
				// Ink codes get cobalt eyes, the house look. Coloured codes stay one colour.
				eye: colour === INK ? QR_ACCENT_EYE : colour,
				logo: logo ?? undefined,
			};
			return { kind: "ready", svg: toSvg(qr, options), file: toSvg(qr, { ...options, size: 1024 }) };
		} catch (err) {
			if (err instanceof DataTooLongError) return { kind: "too-long" };
			throw err;
		}
	}, [text, pattern, colour, logo]);

	const update = <T extends ContentType>(t: T, patch: Partial<Fields[T]>) =>
		setFields((current) => ({ ...current, [t]: { ...current[t], ...patch } }));

	function pickLogo(file: File | undefined) {
		if (!file) return;
		if (file.size > LOGO_MAX_BYTES) {
			setLogoError("That logo file is too big. Use one under 2 MB.");
			return;
		}
		setLogoError(null);
		const reader = new FileReader();
		reader.onload = () => setLogo((current) => ({ href: String(reader.result), size: current?.size ?? "medium" }));
		reader.readAsDataURL(file);
	}

	const ready = result.kind === "ready";
	const filename = `qr-daddy-${type}`;
	const tooLight = contrastRatio(colour, QR_BACKGROUND) < MIN_SCAN_CONTRAST;
	const lightWarning = "This colour is too light for some phones to read. Pick a darker one.";
	const status = tooLight
		? lightWarning
		: logo ? `Scans well · logo covers ${Math.round(LOGO_SIZES[logo.size] ** 2 * 100)}%` : "Ready to download";
	const emptyHint = CONTENT_TYPES.find((c) => c.type === type)!.empty;

	const downloads = (
		<>
			<button type="button" className={secondaryButton} disabled={!ready}
				onClick={() => ready && downloadSvg(result.file, `${filename}.svg`)}>SVG</button>
			<button type="button" className={`${primaryButton} flex-1 md:flex-none`} disabled={!ready}
				onClick={() => ready && downloadPng(result.file, `${filename}.png`)}>Download PNG</button>
		</>
	);

	return (
		<section id="create" className="px-4 pt-6 pb-10 md:px-10 md:pt-4">
			<div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface md:min-h-160 md:flex-row">
				{/* Preview: on top on phones, on the right on desktop. */}
				<div className="flex flex-1 flex-col border-line md:order-last md:border-l">
					<div className="flex flex-1 items-center justify-center bg-surface-sunken p-6 md:p-12" aria-live="polite">
						{result.kind === "ready" && (
							<div className="w-56 rounded-3xl border-3 border-ink bg-surface p-4 shadow-hard md:w-90 md:p-6.5 md:shadow-hard-lg">
								<QrArt svg={result.svg} label="Your QR code" />
							</div>
						)}
						{result.kind === "empty" && (
							<div className="flex flex-col items-center gap-4">
								<QrArt svg={PLACEHOLDER_SVG} label="" className="w-48 md:w-75" />
								<p className="text-base text-ink-soft">{emptyHint}</p>
							</div>
						)}
						{result.kind === "too-long" && (
							<p role="alert" className="flex max-w-80 items-start gap-2 text-base">
								<WarningCircle size={20} className="mt-0.5 shrink-0 text-danger" />
								That's too much to fit in one QR code. Make it shorter.
							</p>
						)}
					</div>

					<div className="hidden items-center justify-between border-t border-line px-6 py-4.5 md:flex">
						<div className="flex items-center gap-3">
							<StepHeading n={3}>Take it home</StepHeading>
							{ready && <span className={`text-sm ${tooLight ? "text-warning" : "text-ink-soft"}`}>{status}</span>}
						</div>
						<div className="flex gap-2.5">{downloads}</div>
					</div>
				</div>

				{/* Controls */}
				<div className="flex w-full shrink-0 flex-col gap-5 p-4 md:w-110 md:p-6">
					<div className="flex gap-1.5 md:hidden" aria-hidden>
						{[1, 2, 3].map((n) => (
							<div key={n} className={`h-1.5 flex-1 rounded-full ${n < step ? "bg-ink" : n === step ? "bg-accent" : "bg-line"}`} />
						))}
					</div>

					<div className={`${step === 1 ? "flex" : "hidden"} flex-col gap-4 md:flex`}>
						<StepHeading n={1}>What's it for?</StepHeading>
						<div className="flex flex-wrap gap-1.5" role="tablist" aria-label="What the code holds">
							{CONTENT_TYPES.map((c) => (
								<button key={c.type} type="button" role="tab" aria-selected={type === c.type}
									className={chip(type === c.type)} onClick={() => setType(c.type)}>{c.label}</button>
							))}
							{DEV_MODE && (
								<button type="button" disabled className={`${chip(false)} flex items-center gap-1.5 opacity-60`}>MoMo <DevModeBadge /></button>
							)}
						</div>
						<ContentFields type={type} fields={fields} update={update} />
						{DEV_MODE && (
							<label className="flex cursor-pointer items-start gap-3 rounded-xl bg-accent-tint p-3.5">
								<input type="checkbox" className="peer sr-only" checked={dynamic} onChange={(e) => setDynamic(e.target.checked)} />
								<span className={`flex h-5.5 w-9 shrink-0 items-center rounded-full px-0.75 ${dynamic ? "justify-end bg-accent" : "justify-start bg-line-strong"}`}>
									<span className="size-4 rounded-full bg-surface" />
								</span>
								<span className="flex flex-1 flex-col gap-0.75">
									<span className="flex items-center gap-2 text-sm font-medium">Dynamic <DevModeBadge /></span>
									<span className="text-sm leading-snug text-ink-soft">Change where it points any time and see who scans.</span>
								</span>
							</label>
						)}
					</div>

					<div className="hidden h-px bg-line md:block" />

					<div className={`${step === 2 ? "flex" : "hidden"} flex-col gap-4 md:flex`}>
						<StepHeading n={2}>Make it yours</StepHeading>
						<div className="flex gap-2" role="radiogroup" aria-label="Pattern">
							{PATTERNS.map((p) => (
								<button key={p.value} type="button" role="radio" aria-checked={pattern === p.value}
									onClick={() => setPattern(p.value)}
									className={`flex h-16 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl md:w-16 md:flex-none ${pattern === p.value ? "border-2 border-ink" : "border border-line-strong"}`}>
									<span className={`size-4.5 bg-ink ${p.glyph}`} />
									<span className="text-xs">{p.label}</span>
								</button>
							))}
						</div>
						<div className="flex items-center gap-2" role="radiogroup" aria-label="Colour">
							{QR_COLOURS.map((c) => (
								<button key={c.value} type="button" role="radio" aria-checked={colour === c.value} aria-label={c.name}
									onClick={() => setColour(c.value)}
									className={`flex size-11 items-center justify-center rounded-full md:size-9 ${colour === c.value ? "border-2 border-ink" : ""}`}>
									<span className="size-8 rounded-full md:size-6.5" style={{ backgroundColor: c.value }} />
								</button>
							))}
							<label className="ml-1 flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-muted">
								<input type="color" className="size-6 cursor-pointer" value={colour} onChange={(e) => setColour(e.target.value)} />
								Custom
							</label>
						</div>
						{tooLight && (
							<p role="status" className="flex items-start gap-2 rounded-xl bg-warning-tint px-3.5 py-3 text-sm">
								<WarningCircle size={18} className="mt-px shrink-0 text-warning" />
								{lightWarning}
							</p>
						)}
						{logo ? (
							<div className="flex flex-col gap-2.5 rounded-xl border border-line-strong p-3">
								<div className="flex items-center gap-3">
									<img src={logo.href} alt="Your logo" className="size-10 rounded-md object-contain" />
									<span className="flex-1 text-sm">Your logo</span>
									<button type="button" aria-label="Remove logo" onClick={() => setLogo(null)} className="flex size-11 items-center justify-center md:size-9">
										<X size={18} />
									</button>
								</div>
								<div className="flex gap-1.5" role="radiogroup" aria-label="Logo size">
									{(Object.keys(LOGO_SIZES) as LogoSize[]).map((size) => (
										<button key={size} type="button" role="radio" aria-checked={logo.size === size}
											className={chip(logo.size === size)} onClick={() => setLogo({ ...logo, size })}>{LOGO_LABELS[size]}</button>
									))}
								</div>
							</div>
						) : (
							<label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-dashed border-line-dashed px-3.5">
								<span className="flex items-center gap-2 text-sm"><UploadSimple size={18} /> Add your logo</span>
								<span className="text-sm text-muted">PNG, JPG or SVG</span>
								<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only"
									onChange={(e) => pickLogo(e.target.files?.[0])} />
							</label>
						)}
						{logoError && <p role="alert" className="text-sm text-danger">{logoError}</p>}
					</div>

					<div className={`${step === 3 ? "flex" : "hidden"} flex-col gap-3 md:hidden`}>
						<StepHeading n={3}>Take it home</StepHeading>
						<p className={`text-base ${ready && tooLight ? "text-warning" : "text-ink-soft"}`}>{ready ? status : "Go back and add what your code should hold."}</p>
					</div>
				</div>
			</div>

			{/* Phone step controls, pinned to the bottom of the screen. */}
			<div className="sticky bottom-0 -mx-4 mt-4 flex gap-2.5 border-t border-line bg-paper px-4 pt-3 pb-7 md:hidden">
				{step > 1 && (
					<button type="button" aria-label="Back" onClick={() => setStep(step - 1)} className={`${secondaryButton} w-13 px-0`}>
						<ArrowLeft size={20} />
					</button>
				)}
				{step === 1 && <button type="button" className={`${primaryButton} flex-1`} disabled={!ready} onClick={() => setStep(2)}>Next: make it yours</button>}
				{step === 2 && <button type="button" className={`${primaryButton} flex-1`} onClick={() => setStep(3)}>Next: take it home</button>}
				{step === 3 && downloads}
			</div>
		</section>
	);
}
