"use client";

import { ArrowLeft, ArrowRight, CheckCircle, UploadSimple, WarningCircle, X } from "@phosphor-icons/react";
import { SHORT_LINK_ORIGIN } from "@qr-daddy/core";
import { DataTooLongError, LOGO_SIZES, encode, toSvg, type LogoSize, type Pattern, type QrCode, type SvgOptions } from "@qr-daddy/qr";
import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";
import { DevModeBadge } from "@/components/dev-mode-badge";
import { QrArt } from "@/components/qr-art";
import { primaryButton, secondaryButton } from "@/components/ui/buttons";
import { DEV_MODE } from "@/lib/dev-mode";
import { downloadPdf, downloadPng, downloadSvg } from "@/lib/download";
import { MIN_SCAN_CONTRAST, QR_BACKGROUND, QR_COLOURS, contrastRatio } from "@/lib/qr-palette";
import { styleFor, svgOptions } from "@/lib/qr-style";
import { CONTENT_TYPES, EMPTY_FIELDS, contentText, contentTitle, type ContentType, type Fields } from "./content";
import { saveDraft, takeDraft } from "./draft";
import { ContentFields } from "./fields";
import { useSavedCode, type SaveTarget } from "./use-saved-code";

const PATTERNS: Array<{ value: Pattern; label: string; glyph: string }> = [
	{ value: "square", label: "Square", glyph: "rounded-none" },
	{ value: "rounded", label: "Rounded", glyph: "rounded-md" },
	{ value: "dots", label: "Dots", glyph: "rounded-full" },
];

const LOGO_LABELS: Record<LogoSize, string> = { small: "Small", medium: "Medium", large: "Large" };
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const INK = QR_COLOURS[0].value;

// Drawn in currentColor so the ghost takes the --color-ghost token in light and dark.
const PLACEHOLDER_SVG = toSvg(encode("https://qr.ashiangmor.com"), { pattern: "rounded", foreground: "currentColor", background: "transparent" });

// Before its first download a dynamic code has no slug yet. Every slug is 6 characters, so this
// stand-in draws a code the same size as the real one.
const PENDING_SHORT_URL = `${SHORT_LINK_ORIGIN}/000000`;

type Ready = { kind: "ready"; svg: string; file: string; qr: QrCode; options: SvgOptions };
type Result = { kind: "empty" } | { kind: "too-long" } | Ready;

/** The preview and the downloadable file for `text`. Throws DataTooLongError when it won't fit. */
function render(text: string, options: SvgOptions): Ready {
	const qr = encode(text, { withLogo: options.logo !== undefined });
	return { kind: "ready", svg: toSvg(qr, options), file: toSvg(qr, { ...options, size: 1024 }), qr, options };
}

function StepHeading({ n, children }: { n: number; children: ReactNode }) {
	return (
		<h2 className="flex items-center gap-2.5">
			<span className="flex size-7 items-center justify-center rounded-full bg-ink font-display text-sm text-surface">{n}</span>
			<span className="font-display text-step">{children}</span>
		</h2>
	);
}

const chip = (active: boolean) =>
	`min-h-11 rounded-full px-3.5 text-sm transition-colors duration-fast ease-out-quart md:min-h-9 md:px-3 ${active ? "bg-ink text-surface" : "bg-chip text-ink"}`;

/**
 * The free generator. Signed out, codes need no account and never leave the browser. Signed in,
 * every download is saved to Your codes (static codes in the background, without holding up the
 * file). Dynamic codes (links only) need an account: signed out, the toggle explains why and
 * offers sign-in while the static code stays downloadable; signed in, the code encodes a short
 * link made on first download.
 */
export function Generator({ signedIn }: { signedIn: boolean }) {
	const [type, setType] = useState<ContentType>("link");
	const [fields, setFields] = useState<Fields>(EMPTY_FIELDS);
	const [pattern, setPattern] = useState<Pattern>("rounded");
	const [colour, setColour] = useState<string>(INK);
	const [logo, setLogo] = useState<{ href: string; size: LogoSize } | null>(null);
	const [logoError, setLogoError] = useState<string | null>(null);
	const [dynamic, setDynamic] = useState(false);
	const [step, setStep] = useState(1);

	// Back from signing in (to keep codes, or for a dynamic code): pick up where the user left off.
	useEffect(() => {
		const draft = takeDraft();
		if (!draft) return;
		setType(draft.type);
		setFields(draft.fields);
		setPattern(draft.pattern);
		setColour(draft.colour);
		setLogo(draft.logo);
		setDynamic(draft.dynamic ?? true);
	}, []);

	// The preview lags typing a little. The type and title it was made from lag with it, so a saved
	// code always matches the file that was downloaded.
	const shown = useDeferredValue(
		useMemo(() => ({ type, content: contentText(type, fields), title: contentTitle(type, fields) }), [type, fields]),
	);
	const content = shown.content;
	const style = useMemo(() => styleFor(pattern, colour), [pattern, colour]);
	const shownDynamic = dynamic && signedIn && shown.type === "link";
	const target = useMemo<SaveTarget | null>(
		() =>
			signedIn && shown.content
				? { kind: shownDynamic ? "dynamic" : "static", contentType: shown.type, destination: shown.content, title: shown.title }
				: null,
		[signedIn, shown, shownDynamic],
	);
	const saved = useSavedCode(style, target);
	const madeCode = shownDynamic ? saved.code : null;
	const text = content && shownDynamic ? (madeCode?.shortUrl ?? PENDING_SHORT_URL) : content;
	const options = useMemo<SvgOptions>(() => ({ ...svgOptions(style), logo: logo ?? undefined }), [style, logo]);

	const result = useMemo<Result>(() => {
		if (!text) return { kind: "empty" };
		try {
			return render(text, options);
		} catch (err) {
			if (err instanceof DataTooLongError) return { kind: "too-long" };
			throw err;
		}
	}, [text, options]);

	/** What a download saves: the static code as previewed, or the dynamic code once it exists. */
	async function fileToSave(): Promise<Ready | null> {
		if (result.kind !== "ready") return null;
		if (target?.kind !== "dynamic") return result;
		const made = await saved.ensure();
		return made?.shortUrl ? render(made.shortUrl, options) : null;
	}

	async function save(kind: "svg" | "pdf" | "png") {
		const file = await fileToSave();
		if (!file) return;
		const download =
			kind === "svg" ? downloadSvg(file.file, `${filename}.svg`)
			: kind === "pdf" ? downloadPdf(file.qr, file.options, `${filename}.pdf`)
			: downloadPng(file.file, `${filename}.png`);
		// Signed in, a static code is saved to Your codes alongside the download, never before it.
		if (target?.kind === "static") void saved.ensure();
		await download;
	}

	// Signed out, going to sign in: keep the work so it survives the trip.
	const keepDraft = (withDynamic: boolean) => saveDraft({ type, fields, pattern, colour, logo, dynamic: withDynamic });

	function toggleDynamic(on: boolean) {
		setDynamic(on);
		if (on && !signedIn) keepDraft(true);
	}

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

	// Only a dynamic code holds the download back: the file needs its short link.
	const ready = result.kind === "ready" && !(shownDynamic && saved.saving);
	const filename = `qr-daddy-${type}`;
	const tooLight = contrastRatio(colour, QR_BACKGROUND) < MIN_SCAN_CONTRAST;
	const lightWarning = "This colour is too light for some phones to read. Pick a darker one.";
	const status = tooLight
		? lightWarning
		: logo ? `Scans well · logo covers ${Math.round(LOGO_SIZES[logo.size] ** 2 * 100)}%` : "Ready to download";
	const emptyHint = CONTENT_TYPES.find((c) => c.type === type)!.empty;

	const savedError = saved.error && (
		<p role="alert" className="flex items-start gap-2 text-sm text-danger motion-safe:animate-callout-in">
			<WarningCircle size={18} className="mt-px shrink-0" />
			{shownDynamic ? saved.error : `Your code downloaded, but it isn't saved to Your codes. ${saved.error}`}
		</p>
	);

	// Step 3 line: where the saved code stands (signed in), or what signing in gives (signed out).
	const savedStatus = !content ? null
		: shownDynamic ? (
			savedError || (madeCode?.shortUrl ? (
				<p className="flex flex-wrap items-center gap-x-2 text-sm text-ink-soft motion-safe:animate-callout-in">
					<span>Short link <span className="font-medium text-ink">{madeCode.shortUrl.replace(/^https:\/\//, "")}</span></span>
					<a href={`/app/codes/${madeCode.id}`} className="flex min-h-11 items-center gap-1 font-medium text-ink underline underline-offset-4 md:min-h-0">
						Edit and see scans <ArrowRight size={14} />
					</a>
				</p>
			) : (
				<p className="text-sm text-ink-soft">
					{saved.saving ? "Making your short link…" : "Dynamic: your short link is made when you first download."}
				</p>
			))
		) : signedIn ? (
			savedError || (saved.code && (
				<a href="/app" className="flex min-h-11 items-center gap-1.5 self-start text-sm text-ink-soft motion-safe:animate-callout-in md:min-h-0">
					<CheckCircle size={16} className="shrink-0" />
					Saved to <span className="font-medium text-ink underline underline-offset-4">Your codes</span>
				</a>
			))
		) : !(dynamic && type === "link") && (
			// The Dynamic callout already offers sign-in; otherwise one quiet line, never in the way.
			<p className="text-sm text-ink-soft">
				<a href="/sign-in?next=/" onClick={() => keepDraft(false)} className="inline-flex min-h-11 items-center font-medium text-ink underline underline-offset-4 md:min-h-0">Sign in</a>
				{" "}to keep your codes in one place.
			</p>
		);

	const downloads = (
		<>
			<button type="button" className={secondaryButton} disabled={!ready} onClick={() => save("svg")}>SVG</button>
			<button type="button" className={secondaryButton} disabled={!ready} onClick={() => save("pdf")}>PDF</button>
			<button type="button" className={`${primaryButton} flex-1 md:flex-none`} disabled={!ready} onClick={() => save("png")}>
				{/* Four buttons share the phone bar, so phones show just "PNG"; screen readers still hear "Download PNG". */}
				<span className="max-md:sr-only">Download&nbsp;</span>PNG
			</button>
		</>
	);

	return (
		<section id="create" className="mx-auto w-full max-w-page px-4 pt-6 pb-10 md:px-10 md:pt-4">
			<div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface md:min-h-160 md:flex-row">
				{/* Preview: on top on phones, on the right on desktop. */}
				<div className="flex flex-1 flex-col border-line md:order-last md:border-l">
					<div className="flex flex-1 items-center justify-center bg-surface-sunken p-6 md:p-12" aria-live="polite">
						{result.kind === "ready" && (
							<div key={`${pattern} ${colour} ${logo?.size}`}
								className="w-56 rounded-3xl border-3 border-sticker-edge bg-sticker p-4 shadow-hard motion-safe:animate-settle md:w-90 md:p-6.5 md:shadow-hard-lg">
								<QrArt svg={result.svg} label="Your QR code" />
							</div>
						)}
						{result.kind === "empty" && (
							<div className="flex flex-col items-center gap-4">
								<QrArt svg={PLACEHOLDER_SVG} label="" className="w-48 text-ghost md:w-75" />
								<p className="text-base text-ink-soft">{emptyHint}</p>
							</div>
						)}
						{result.kind === "too-long" && (
							<p role="alert" className="flex max-w-80 items-start gap-2 text-base motion-safe:animate-callout-in">
								<WarningCircle size={20} className="mt-0.5 shrink-0 text-danger" />
								That's too much to fit in one QR code. Make it shorter.
							</p>
						)}
					</div>

					<div className="hidden flex-col gap-2 border-t border-line px-6 py-4.5 md:flex">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<StepHeading n={3}>Take it home</StepHeading>
								{result.kind === "ready" && <span className={`text-sm ${tooLight ? "text-warning" : "text-ink-soft"}`}>{status}</span>}
							</div>
							<div className="flex gap-2.5">{downloads}</div>
						</div>
						{savedStatus}
					</div>
				</div>

				{/* Controls */}
				<div className="flex w-full shrink-0 flex-col gap-5 p-4 md:w-110 md:p-6">
					<div className="flex gap-1.5 md:hidden" aria-hidden>
						{[1, 2, 3].map((n) => (
							<div key={n} className={`h-1.5 flex-1 rounded-full transition-colors duration-base ease-out-quart ${n < step ? "bg-ink" : n === step ? "bg-accent" : "bg-line"}`} />
						))}
					</div>

					<div className={`${step === 1 ? "flex" : "hidden"} flex-col gap-4 max-md:motion-safe:animate-step-in md:flex`}>
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
						{type === "link" && (
							<div className="flex flex-col gap-3 rounded-xl bg-accent-tint p-3.5">
								<label className="flex cursor-pointer items-start gap-3">
									<input type="checkbox" role="switch" className="peer sr-only" checked={dynamic} onChange={(e) => toggleDynamic(e.target.checked)} />
									<span className={`flex h-5.5 w-9 shrink-0 items-center rounded-full px-0.75 transition-colors duration-fast ease-out-quart peer-focus-visible:ring-2 peer-focus-visible:ring-ink peer-focus-visible:ring-offset-2 ${dynamic ? "justify-end bg-accent" : "justify-start bg-line-strong"}`}>
										<span className="size-4 rounded-full bg-on-accent" />
									</span>
									<span className="flex flex-1 flex-col gap-0.75">
										<span className="text-sm font-medium">Dynamic</span>
										<span className="text-sm leading-snug text-ink-soft">Change where it points any time and see who scans.</span>
									</span>
								</label>
								{dynamic && !signedIn && (
									<div role="status" className="flex flex-col gap-2 border-t border-accent-soft pt-3 motion-safe:animate-callout-in">
										<p className="text-sm leading-snug">
											Dynamic codes need a free account. You can change where the code points after printing and see how many people scan it.
											Your code still downloads as a regular one without it.
										</p>
										<a href="/sign-in?next=/" onClick={() => keepDraft(true)}
											className="flex min-h-11 items-center gap-1 self-start text-sm font-medium text-ink underline underline-offset-4 md:min-h-0">
											Sign in with your email <ArrowRight size={14} />
										</a>
									</div>
								)}
							</div>
						)}
					</div>

					<div className="hidden h-px bg-line md:block" />

					<div className={`${step === 2 ? "flex" : "hidden"} flex-col gap-4 max-md:motion-safe:animate-step-in md:flex`}>
						<StepHeading n={2}>Make it yours</StepHeading>
						<div className="flex gap-2" role="radiogroup" aria-label="Pattern">
							{PATTERNS.map((p) => (
								<button key={p.value} type="button" role="radio" aria-checked={pattern === p.value}
									onClick={() => setPattern(p.value)}
									className={`flex h-16 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl transition-colors duration-fast ease-out-quart md:w-16 md:flex-none ${pattern === p.value ? "border-2 border-ink" : "border border-line-strong"}`}>
									<span className={`size-4.5 bg-ink ${p.glyph}`} />
									<span className="text-xs">{p.label}</span>
								</button>
							))}
						</div>
						<div className="flex items-center gap-2" role="radiogroup" aria-label="Colour">
							{QR_COLOURS.map((c) => (
								<button key={c.value} type="button" role="radio" aria-checked={colour === c.value} aria-label={c.name}
									onClick={() => setColour(c.value)}
									className={`flex size-11 items-center justify-center rounded-full border-2 transition-colors duration-fast ease-out-quart md:size-9 ${colour === c.value ? "border-ink" : "border-transparent"}`}>
									<span className="size-8 rounded-full ring-1 ring-swatch-edge md:size-6.5" style={{ backgroundColor: c.value }} />
								</button>
							))}
							<label className="ml-1 flex min-h-11 cursor-pointer items-center gap-1.5 text-sm text-muted">
								<input type="color" className="size-6 cursor-pointer" value={colour} onChange={(e) => setColour(e.target.value)} />
								Custom
							</label>
						</div>
						{tooLight && (
							<p role="status" className="flex items-start gap-2 rounded-xl bg-warning-tint px-3.5 py-3 text-sm motion-safe:animate-callout-in">
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
						{logoError && <p role="alert" className="text-sm text-danger motion-safe:animate-callout-in">{logoError}</p>}
					</div>

					<div className={`${step === 3 ? "flex" : "hidden"} flex-col gap-3 motion-safe:animate-step-in md:hidden`}>
						<StepHeading n={3}>Take it home</StepHeading>
						<p className={`text-base ${result.kind === "ready" && tooLight ? "text-warning" : "text-ink-soft"}`}>{result.kind === "ready" ? status : "Go back and add what your code should hold."}</p>
						{savedStatus}
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
				{step === 1 && <button type="button" className={`${primaryButton} flex-1`} disabled={result.kind !== "ready"} onClick={() => setStep(2)}>Next: make it yours</button>}
				{step === 2 && <button type="button" className={`${primaryButton} flex-1`} onClick={() => setStep(3)}>Next: take it home</button>}
				{step === 3 && downloads}
			</div>
		</section>
	);
}
