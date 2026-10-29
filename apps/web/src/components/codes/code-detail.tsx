"use client";

import { ArrowLeft, Check, CheckCircle, Copy, DownloadSimple, Trash, WarningCircle } from "@phosphor-icons/react";
import type { Code } from "@qr-daddy/core";
import { encode, toSvg } from "@qr-daddy/qr";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { contentLabel, heldFields, type HeldField } from "@/components/generator/content";
import { inputClass } from "@/components/generator/fields";
import { QrArt } from "@/components/qr-art";
import { dangerButton, primaryButton, secondaryButton, textButton } from "@/components/ui/buttons";
import { Dialog } from "@/components/ui/dialog";
import { apiRequest, getApiErrorText } from "@/lib/api-client";
import { downloadPdf, downloadPng, downloadSvg } from "@/lib/download";
import { prettyUrl } from "@/lib/format";
import { readStyle, svgOptions } from "@/lib/qr-style";

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-6";

function ErrorLine({ children }: { children: string }) {
	return (
		<p role="alert" className="flex items-start gap-2 text-sm text-danger motion-safe:animate-callout-in">
			<WarningCircle size={18} className="mt-px shrink-0" />
			{children}
		</p>
	);
}

/** "Points to": change where the code sends people. Printed copies follow straight away. */
function PointsTo({ codeId, destination }: { codeId: string; destination: string }) {
	const [current, setCurrent] = useState(destination);
	const [draft, setDraft] = useState(destination);
	const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
	const [error, setError] = useState<string | null>(null);
	const dirty = draft.trim() !== current;

	async function save(e: FormEvent) {
		e.preventDefault();
		setState("saving");
		setError(null);
		const result = await apiRequest<Code>(`/api/codes/${codeId}`, "PATCH", { destination: draft });
		if (!result.ok) {
			setState("idle");
			setError(getApiErrorText(result));
			return;
		}
		setCurrent(result.data.destination);
		setDraft(result.data.destination);
		setState("saved");
	}

	return (
		<form onSubmit={save} className={card} aria-labelledby="points-to">
			<div className="flex flex-col gap-2">
				<h2 id="points-to" className="font-display text-step md:text-2xl">Points to</h2>
				<p className="text-sm text-ink-soft">Change where this code goes. Printed copies keep working.</p>
			</div>
			<input className={inputClass} inputMode="url" autoComplete="url" aria-label="Where this code points" value={draft}
				onChange={(e) => {
					setDraft(e.target.value);
					setState("idle");
					setError(null);
				}} />
			{state === "saved" && (
				<p role="status" className="flex items-center gap-2 text-sm motion-safe:animate-callout-in">
					<CheckCircle size={20} className="shrink-0" /> Saved. Scans now open the new link.
				</p>
			)}
			{error && <ErrorLine>{error}</ErrorLine>}
			<div className="flex items-center gap-2">
				<button type="submit" disabled={!dirty || state === "saving"} className={`${primaryButton} w-30`}>
					{state === "saving" ? "Saving…" : "Save"}
				</button>
				{dirty && (
					<button type="button" className={textButton} onClick={() => { setDraft(current); setError(null); }}>Cancel</button>
				)}
			</div>
			{dirty && <p className="text-xs text-ink-soft">Was {prettyUrl(current)}</p>}
		</form>
	);
}

/** "What it holds": a static code's content, read back for people. Read-only: it's in the pattern. */
function WhatItHolds({ fields }: { fields: HeldField[] }) {
	const [revealed, setRevealed] = useState(false);
	return (
		<section className={card} aria-labelledby="what-it-holds">
			<div className="flex flex-col gap-2">
				<h2 id="what-it-holds" className="font-display text-step md:text-2xl">What it holds</h2>
				<p className="text-sm text-ink-soft">This is written into the code itself, so it can't change. To hold something else, make a new code.</p>
			</div>
			<dl className="flex flex-col gap-3">
				{fields.map((field) => (
					<div key={field.label} className="flex flex-col gap-0.5">
						<dt className="text-xs text-ink-soft">{field.label}</dt>
						<dd className="flex items-center justify-between gap-3">
							{field.secret && !revealed ? (
								<span className="text-base"><span aria-hidden>••••••••</span><span className="sr-only">Hidden</span></span>
							) : (
								<span className="min-w-0 text-base break-words whitespace-pre-line">{field.value}</span>
							)}
							{field.secret && (
								<button type="button" className={textButton} onClick={() => setRevealed(!revealed)}>{revealed ? "Hide" : "Show"}</button>
							)}
						</dd>
					</div>
				))}
			</dl>
		</section>
	);
}

/**
 * One saved code: its sticker and files, and delete. A dynamic code adds its short link, where it
 * points and its scans (`analytics`, rendered on the server); a static code shows what it holds.
 * Phones stack everything in one column, with delete at the very end.
 */
export function CodeDetail({ code, name, madeOn, allTimeScans, analytics }: {
	code: Code;
	name: string;
	madeOn: string;
	allTimeScans: string;
	/** Dynamic codes only. */
	analytics: ReactNode;
}) {
	const router = useRouter();
	const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
	const [confirming, setConfirming] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const text = code.shortUrl ?? code.destination;
	const file = useMemo(() => {
		const qr = encode(text);
		const options = svgOptions(readStyle(code.style));
		return { qr, options, preview: toSvg(qr, options), svg: toSvg(qr, { ...options, size: 1024 }) };
	}, [text, code.style]);
	const filename = `qr-daddy-${code.slug ?? code.contentType}`;

	async function copy() {
		if (!code.shortUrl) return;
		try {
			await navigator.clipboard.writeText(code.shortUrl);
			setCopied("copied");
		} catch {
			setCopied("failed");
		}
		setTimeout(() => setCopied("idle"), 2000);
	}

	async function remove() {
		setDeleting(true);
		setDeleteError(null);
		const result = await apiRequest<null>(`/api/codes/${code.id}`, "DELETE");
		if (!result.ok && result.status !== 404) {
			setDeleting(false);
			setDeleteError(getApiErrorText(result));
			return;
		}
		router.push(`/app?deleted=${code.kind === "static" ? "static" : "1"}`);
		router.refresh();
	}

	const deleteTrigger = (className: string) => (
		<button type="button" onClick={() => setConfirming(true)}
			className={`flex h-11 items-center gap-2 self-start text-base font-medium text-danger md:text-sm ${className}`}>
			<Trash size={20} /> Delete this code
		</button>
	);

	return (
		<>
			<div className="flex flex-col gap-3">
				<a href="/app" className="flex h-11 items-center gap-2 self-start text-sm text-ink-soft"><ArrowLeft size={18} /> Your codes</a>
				<h1 className="font-display text-display-lg break-words">{name}</h1>
				{code.shortUrl ? (
					<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
						<div className="flex items-center gap-3">
							<span className="text-base font-medium">{prettyUrl(code.shortUrl)}</span>
							<button type="button" onClick={copy}
								className="flex h-11 items-center gap-1.5 rounded-full bg-chip px-3.5 text-sm font-medium transition-colors duration-fast ease-out-quart md:h-9">
								{copied === "copied" ? <Check size={16} /> : <Copy size={16} />}
								{copied === "copied" ? "Copied" : "Copy"}
							</button>
							<span role="status" className="sr-only">{copied === "copied" ? "Short link copied" : ""}</span>
						</div>
						<span className="text-sm text-ink-soft">Dynamic · made {madeOn}</span>
					</div>
				) : (
					<span className="text-sm text-ink-soft">{contentLabel(code.contentType)} · made {madeOn}</span>
				)}
				{copied === "failed" && <ErrorLine>We couldn't copy the link. Select it and copy it yourself.</ErrorLine>}
			</div>

			<div className="flex flex-col gap-4 md:flex-row md:items-start">
				<div className="flex flex-col gap-4 md:w-111 md:shrink-0">
					<section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Download">
						<div className="flex items-center justify-center bg-surface-sunken p-6 md:p-8">
							<div className="w-52 rounded-3xl border-3 border-sticker-edge bg-sticker p-3.5 shadow-hard md:w-71 md:p-4.5">
								<QrArt svg={file.preview} label={`QR code for ${code.shortUrl ? prettyUrl(code.shortUrl) : name}`} />
							</div>
						</div>
						<div className="flex flex-col gap-3 border-t border-line p-4 md:p-6">
							<h2 className="text-sm font-medium">Download</h2>
							<div className="grid grid-cols-3 gap-2">
								<button type="button" className={`${secondaryButton} gap-2 px-2`} onClick={() => downloadPng(file.svg, `${filename}.png`)}><DownloadSimple size={18} /> PNG</button>
								<button type="button" className={`${secondaryButton} gap-2 px-2`} onClick={() => downloadSvg(file.svg, `${filename}.svg`)}><DownloadSimple size={18} /> SVG</button>
								<button type="button" className={`${secondaryButton} gap-2 px-2`} onClick={() => downloadPdf(file.qr, file.options, `${filename}.pdf`)}><DownloadSimple size={18} /> PDF</button>
							</div>
							<p className="text-xs text-ink-soft">PNG for WhatsApp and the web. SVG or PDF for print shops.</p>
						</div>
					</section>
					{code.kind === "dynamic" && <PointsTo codeId={code.id} destination={code.destination} />}
					{deleteTrigger("max-md:hidden")}
				</div>
				<div className="min-w-0 flex-1">
					{code.kind === "dynamic" ? analytics : <WhatItHolds fields={heldFields(code.contentType, code.destination)} />}
				</div>
				{deleteTrigger("md:hidden")}
			</div>

			<Dialog open={confirming} onClose={() => setConfirming(false)} labelledBy="delete-title">
				<h2 id="delete-title" className="font-display text-step">Delete this code?</h2>
				{code.kind === "dynamic" ? (
					<p className="text-base text-ink-soft md:text-sm">
						{name} stops working straight away. Anyone who scans a printed copy will see a page saying the code no longer works.
						{allTimeScans === "0" ? "" : ` Its ${allTimeScans} ${allTimeScans === "1" ? "scan goes" : "scans go"} too.`} You can't undo this.
					</p>
				) : (
					<p className="text-base text-ink-soft md:text-sm">
						{name} is removed from Your codes. Copies you've already printed or shared keep working, because what it holds is in the code itself. You can't undo this.
					</p>
				)}
				{deleteError && <ErrorLine>{deleteError}</ErrorLine>}
				<div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
					<button type="button" className={secondaryButton} onClick={() => setConfirming(false)}>Keep it</button>
					<button type="button" className={dangerButton} disabled={deleting} onClick={remove}>
						{deleting ? "Deleting…" : "Delete code"}
					</button>
				</div>
			</Dialog>
		</>
	);
}
