/**
 * Seven daily bars, oldest first. Only the busiest day is cobalt; the rest are accent-soft.
 * No scans at all draws a dashed baseline. Decorative: the number beside it carries the meaning.
 */
export function Sparkline({ days }: { days: number[] }) {
	const max = Math.max(...days);
	if (max === 0) {
		return (
			<div aria-hidden className="flex h-6 w-15 items-end gap-1">
				{days.map((_, i) => <span key={i} className="h-px flex-1 bg-line-dashed" />)}
			</div>
		);
	}
	const peak = days.lastIndexOf(max);
	return (
		<div aria-hidden className="flex h-6 w-15 items-end gap-1">
			{days.map((scans, i) => (
				<span key={i} style={{ height: `${Math.max((scans / max) * 100, 8)}%` }}
					className={`flex-1 rounded-xs ${i === peak ? "bg-accent" : "bg-accent-soft"}`} />
			))}
		</div>
	);
}
