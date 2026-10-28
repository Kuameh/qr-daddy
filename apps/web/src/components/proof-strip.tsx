import { DevModeBadge } from "@/components/dev-mode-badge";
import { DEV_MODE } from "@/lib/dev-mode";

const SCANS_PER_DAY = [14, 22, 18, 29, 25, 48, 36];

function Card({ title, body, dev = false }: { title: string; body: string; dev?: boolean }) {
	return (
		<div className="flex flex-1 flex-col gap-2 rounded-2xl border border-line bg-surface p-5.5">
			<h3 className="flex items-center gap-2 font-display text-2xl tracking-tight">{title} {dev && <DevModeBadge />}</h3>
			<p className="text-base leading-normal text-ink-soft">{body}</p>
		</div>
	);
}

export function ProofStrip() {
	return (
		<section className="flex flex-col gap-4 px-4 pb-16 md:flex-row md:px-10">
			{DEV_MODE ? (
				<div className="flex flex-1 flex-col gap-2.5 rounded-2xl border border-line bg-surface p-5.5">
					<span className="flex items-center gap-2 text-sm text-muted">Kofi's menu · last 7 days <DevModeBadge /></span>
					<span className="font-display text-display-md">1,284 scans</span>
					<div className="flex h-12 items-end gap-1.5">
						{SCANS_PER_DAY.map((height, day) => (
							<div
								key={day}
								style={{ height }}
								className={`flex-1 rounded-sm ${day === 5 ? "bg-accent" : "bg-accent-soft"}`}
							/>
						))}
					</div>
				</div>
			) : (
				<Card title="No account needed" body="Make a code and download it. Nothing to sign up for." />
			)}
			{DEV_MODE ? (
				<Card dev title="Edit after printing" body="Menu changed? Point the same code at the new page. The poster stays on the wall." />
			) : (
				<Card title="Your logo in the middle" body="Add your logo and we make the code stronger around it, so phones still read it." />
			)}
			<Card title="Print-ready files" body="Sharp SVG for print shops, PNG for WhatsApp and the web." />
		</section>
	);
}
