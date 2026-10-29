import { Desktop, DeviceMobile, DeviceTablet, Question } from "@phosphor-icons/react/dist/ssr";
import type { Device, ScanSummary } from "@qr-daddy/core";
import type { ReactNode } from "react";
import { countryName, formatCount, formatDay, formatDayMonth } from "@/lib/format";

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-6";
const cardTitle = "font-display text-step md:text-2xl";

const DEVICES: Record<Device | "unknown", { label: string; icon: ReactNode }> = {
	mobile: { label: "Mobile", icon: <DeviceMobile size={18} /> },
	desktop: { label: "Desktop", icon: <Desktop size={18} /> },
	tablet: { label: "Tablet", icon: <DeviceTablet size={18} /> },
	unknown: { label: "Unknown", icon: <Question size={18} /> },
};

const percent = (part: number, whole: number) => Math.round((part / whole) * 100);

function phoneShare(phones: number, total: number): string {
	const tenths = Math.round((phones / total) * 10);
	if (tenths === 10) return phones === total ? "Every scan so far came from a phone." : "Nearly every scan comes from a phone.";
	if (tenths === 0) return phones === 0 ? "No scans from phones yet." : "Hardly any scans come from phones.";
	return `${tenths} in 10 scans come from phones.`;
}

function Stat({ label, value, big = false }: { label: string; value: number; big?: boolean }) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm text-ink-soft">{label}</span>
			<span className={`font-display ${big ? "text-display-md" : "text-2xl md:text-display-md"}`}>{formatCount(value)}</span>
		</div>
	);
}

/** One row of a share list: label, "2,604 · 89%", and a bar as wide as the share. */
function Meter({ label, scans, total }: { label: ReactNode; scans: number; total: number }) {
	const share = percent(scans, total);
	return (
		<li className="flex flex-col gap-2">
			<span className="flex items-center justify-between gap-3 text-sm">
				<span className="flex items-center gap-2">{label}</span>
				<span className="text-ink-soft">{formatCount(scans)} · {share}%</span>
			</span>
			<span className="h-1.5 rounded-full bg-accent-soft" style={{ width: `${Math.max(share, 1)}%` }} />
		</li>
	);
}

/**
 * Scans per day as bars. The busiest day is the only cobalt bar and carries its count;
 * today carries its count too but stays accent-soft, so cobalt keeps meaning "the peak".
 */
function ScanBars({ perDay }: { perDay: ScanSummary["perDay"] }) {
	const counts = perDay.map((day) => day.scans);
	const max = Math.max(...counts);
	const peak = max > 0 ? counts.lastIndexOf(max) : -1;
	const today = perDay.length - 1;
	const middle = Math.floor(perDay.length / 2);
	return (
		<div className="flex flex-col gap-2">
			<div className="flex h-36 items-end gap-0.5 border-b border-line pt-5 md:h-44 md:gap-1.5">
				{perDay.map((day, i) => (
					<div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
						{(i === peak || (i === today && day.scans > 0)) && <span className="text-xs font-medium">{formatCount(day.scans)}</span>}
						<div style={{ height: `${max > 0 ? (day.scans / max) * 100 : 0}%` }}
							className={`w-full shrink-0 rounded-t-xs ${i === peak ? "bg-accent" : "bg-accent-soft"}`} />
					</div>
				))}
			</div>
			<div className="flex justify-between text-xs text-ink-soft">
				<span>{formatDayMonth(perDay[0].date)}</span>
				<span>{formatDayMonth(perDay[middle].date)}</span>
				<span>Today</span>
			</div>
		</div>
	);
}

/** Totals, the 30-day chart, top countries and devices for one code. Server-rendered. */
export function ScanAnalytics({ summary }: { summary: ScanSummary }) {
	const today = summary.perDay.at(-1)!.scans;
	const counts = summary.perDay.map((day) => day.scans);
	const max = Math.max(...counts);
	const peakDay = summary.perDay[counts.lastIndexOf(max)];
	const chartSummary =
		summary.total === 0
			? "No scans in the last 30 days. They show up here as soon as someone scans your code."
			: `Busiest day: ${formatDay(peakDay.date)}, ${formatCount(max)} ${max === 1 ? "scan" : "scans"}. Today so far: ${formatCount(today)}.`;
	const mobile = summary.devices.find((d) => d.device === "mobile")?.scans ?? 0;

	return (
		<div className="flex flex-col gap-4">
			{/* Phones: total on top, the two smaller counts under it. Desktop: three across. */}
			<div className="grid grid-cols-2 gap-4 rounded-2xl border border-line bg-surface p-4 md:grid-cols-3 md:gap-0 md:p-0">
				<div className="col-span-2 border-b border-line pb-4 md:col-span-1 md:border-r md:border-b-0 md:p-6"><Stat big label="Total scans" value={summary.allTime} /></div>
				<div className="md:border-r md:border-line md:p-6"><Stat label="Last 7 days" value={summary.last7Days} /></div>
				<div className="md:p-6"><Stat label={summary.total > 0 ? "Today so far" : "Today"} value={today} /></div>
			</div>

			<section className={card} aria-labelledby="scans-per-day">
				<div className="flex flex-col gap-1">
					<div className="flex items-baseline justify-between">
						<h2 id="scans-per-day" className={cardTitle}>Scans per day</h2>
						<span className="hidden text-sm text-ink-soft md:block">Last 30 days</span>
					</div>
					<p className="text-sm text-ink-soft"><span className="md:hidden">Last 30 days. </span>{chartSummary}</p>
				</div>
				<div role="img" aria-label={`Scans per day, last 30 days. ${chartSummary}`}>
					<ScanBars perDay={summary.perDay} />
				</div>
			</section>

			<div className="flex flex-col gap-4 md:flex-row">
				<section className={`${card} md:flex-1`} aria-labelledby="top-countries">
					<h2 id="top-countries" className={cardTitle}>Top countries</h2>
					{summary.total === 0 ? (
						<p className="text-sm text-ink-soft">No scans yet.</p>
					) : (
						<ul className="flex flex-col gap-3.5">
							{summary.countries.slice(0, 5).map((row) => (
								<Meter key={row.country ?? "unknown"} label={countryName(row.country)} scans={row.scans} total={summary.total} />
							))}
						</ul>
					)}
				</section>
				<section className={`${card} md:flex-1`} aria-labelledby="devices">
					<h2 id="devices" className={cardTitle}>Devices</h2>
					{summary.total === 0 ? (
						<p className="text-sm text-ink-soft">No scans yet.</p>
					) : (
						<>
							<p className="text-sm text-ink-soft">{phoneShare(mobile, summary.total)}</p>
							<ul className="flex flex-col gap-3.5">
								{summary.devices.map((row) => {
									const device = DEVICES[row.device ?? "unknown"];
									return <Meter key={row.device ?? "unknown"} label={<>{device.icon}{device.label}</>} scans={row.scans} total={summary.total} />;
								})}
							</ul>
						</>
					)}
				</section>
			</div>
		</div>
	);
}
