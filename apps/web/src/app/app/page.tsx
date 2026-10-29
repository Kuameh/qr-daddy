import { CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { encode, toSvg } from "@qr-daddy/qr";
import { listCodes, type CodeWithStats } from "@qr-daddy/core";
import type { Metadata } from "next";
import { CodeThumb } from "@/components/codes/code-thumb";
import { QrArt } from "@/components/qr-art";
import { SiteNav } from "@/components/site-nav";
import { primaryButton } from "@/components/ui/buttons";
import { Sparkline } from "@/components/ui/sparkline";
import { Toast } from "@/components/ui/toast";
import { formatCount, prettyUrl, timeAgo } from "@/lib/format";
import { coreDeps } from "@/lib/server/cloudflare";
import { requireUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Your codes · QR Daddy" };

// "New code" opens the generator with Dynamic already on.
const NEW_CODE_HREF = "/?dynamic=on#create";
const GHOST_SVG = toSvg(encode("https://q.ashiangmor.com/000000"), { pattern: "dots", foreground: "currentColor", background: "transparent", quietZone: 2 });

const STEPS = [
	{ title: "Paste your link", body: "Go to Create and paste the page you want people to land on." },
	{ title: "Turn on Dynamic", body: "It prints as a short q.ashiangmor.com link you can change later." },
	{ title: "Download and print", body: "Your code shows up here with its scans." },
];

function NewCodeButton({ className = "" }: { className?: string }) {
	return (
		<a href={NEW_CODE_HREF} className={`${primaryButton} gap-2 ${className}`}>
			<Plus size={20} /> New code
		</a>
	);
}

function Empty() {
	return (
		<div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface md:flex-row">
			<div className="flex items-center justify-center border-b border-line bg-surface-sunken p-6 md:w-120 md:border-r md:border-b-0 md:p-12">
				<div className="w-52 rounded-3xl border-2 border-line-strong p-3 text-ghost">
					<QrArt svg={GHOST_SVG} label="" />
				</div>
			</div>
			<div className="flex flex-1 flex-col gap-5 p-4 md:max-w-150 md:p-10">
				<h2 className="font-display text-step md:text-2xl">No dynamic codes yet.</h2>
				<p className="text-base text-ink-soft md:text-lg">
					A dynamic code prints once and points wherever you say. Change the link later and the poster on the wall keeps working.
				</p>
				<ol className="flex flex-col gap-4">
					{STEPS.map((step, i) => (
						<li key={step.title} className="flex items-start gap-3">
							<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink font-display text-sm text-surface">{i + 1}</span>
							<span className="flex flex-col gap-0.5">
								<span className="text-base font-medium">{step.title}</span>
								<span className="text-sm text-ink-soft">{step.body}</span>
							</span>
						</li>
					))}
				</ol>
				<NewCodeButton className="md:self-start" />
			</div>
		</div>
	);
}

function Row({ code, now }: { code: CodeWithStats; now: number }) {
	const name = code.title ?? prettyUrl(code.destination);
	const lastScanned = timeAgo(code.lastScannedAt, now);
	return (
		<li className="border-t border-line first:border-t-0">
			<a href={`/app/codes/${code.id}`} className="flex items-start gap-3 px-4 py-4 transition-colors duration-fast ease-out-quart active:bg-surface-sunken md:items-center md:gap-4 md:px-6">
				<CodeThumb shortUrl={code.shortUrl} style={code.style} />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="text-base font-medium">{name}</span>
					<span className="truncate text-sm text-ink-soft">{prettyUrl(code.shortUrl)}</span>
					<span className="truncate text-xs text-ink-soft md:hidden">→ {prettyUrl(code.destination)}</span>
				</span>
				<span className="hidden w-86 truncate pr-4 text-sm text-ink-soft md:block">{prettyUrl(code.destination)}</span>
				<span className="flex shrink-0 flex-col items-end gap-1.5 md:w-56 md:flex-row md:items-center md:gap-9">
					<span className="font-display text-lg md:w-10">{formatCount(code.scansLast7Days)}</span>
					<Sparkline days={code.dailyScans} />
					<span className="text-xs text-ink-soft md:hidden">{lastScanned}</span>
				</span>
				<span className="hidden w-40 text-sm text-ink-soft md:block">{lastScanned}</span>
				<CaretRight size={24} className="hidden shrink-0 text-ink-soft md:block" />
			</a>
		</li>
	);
}

export default async function YourCodes({ searchParams }: PageProps<"/app">) {
	const user = await requireUser("/app");
	const codes = await listCodes(await coreDeps(), user.id);
	const deleted = (await searchParams).deleted === "1";
	const now = Date.now();
	const weekScans = codes.reduce((sum, code) => sum + code.scansLast7Days, 0);

	return (
		<>
			<SiteNav user={user} page="codes" />
			<main className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 pt-7 pb-16 md:px-10 md:pt-9">
				<div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="flex flex-col gap-2">
						<h1 className="font-display text-display-lg">Your codes</h1>
						<p className="text-sm text-ink-soft">
							{codes.length === 0
								? "Dynamic codes you make show up here."
								: `${codes.length === 1 ? "1 dynamic code" : `${codes.length} dynamic codes`} · ${formatCount(weekScans)} ${weekScans === 1 ? "scan" : "scans"} in the last 7 days`}
						</p>
					</div>
					{codes.length > 0 && <NewCodeButton />}
				</div>

				{codes.length === 0 ? (
					<Empty />
				) : (
					<div className="overflow-hidden rounded-2xl border border-line bg-surface">
						<div aria-hidden className="hidden items-center gap-4 border-b border-line px-6 py-3.5 text-xs text-ink-soft md:flex">
							<span className="flex-1 pl-16">Code</span>
							<span className="w-86">Points to</span>
							<span className="w-56">Scans, last 7 days</span>
							<span className="w-40">Last scanned</span>
							<span className="w-6" />
						</div>
						<ul>{codes.map((code) => <Row key={code.id} code={code} now={now} />)}</ul>
					</div>
				)}
			</main>
			{deleted && <Toast clearParam="deleted">Code deleted. Its short link has stopped working.</Toast>}
		</>
	);
}
