const SAMPLE_SCANS_PER_DAY = [14, 22, 18, 29, 25, 48, 36];
const SAMPLE_PEAK = SAMPLE_SCANS_PER_DAY.indexOf(Math.max(...SAMPLE_SCANS_PER_DAY));

function Card({ title, body }: { title: string; body: string }) {
	return (
		<div className="flex flex-1 flex-col gap-2 rounded-2xl border border-line bg-surface p-5.5">
			<h3 className="font-display text-2xl tracking-tight">{title}</h3>
			<p className="text-base leading-normal text-ink-soft">{body}</p>
		</div>
	);
}

export function ProofStrip() {
	return (
		<section className="mx-auto flex w-full max-w-page flex-col gap-4 px-4 pb-16 md:flex-row md:px-10">
			{/* A sample of what a dynamic code's owner sees in Your codes. */}
			<div className="flex flex-1 flex-col gap-2.5 rounded-2xl border border-line bg-surface p-5.5">
				<span className="text-sm text-muted">Kofi's menu · last 7 days</span>
				<span className="font-display text-display-md">1,284 scans</span>
				<div className="flex h-12 items-end gap-1.5" aria-hidden>
					{SAMPLE_SCANS_PER_DAY.map((height, day) => (
						<div key={day} style={{ height }} className={`flex-1 rounded-sm ${day === SAMPLE_PEAK ? "bg-accent" : "bg-accent-soft"}`} />
					))}
				</div>
				<span className="text-sm text-ink-soft">See who scans, with a free account.</span>
			</div>
			<Card title="Edit after printing" body="Menu changed? Point the same code at the new page. The poster stays on the wall. Free with an account." />
			<Card title="Print-ready files" body="Sharp SVG for print shops, PNG for WhatsApp and the web. No account needed." />
		</section>
	);
}
