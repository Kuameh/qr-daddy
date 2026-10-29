// Display formats for Your codes. Server-rendered, so every viewer gets the same strings.

const COUNT = new Intl.NumberFormat("en-GB");
const REGION = new Intl.DisplayNames(["en"], { type: "region" });
// Spelled out rather than Intl: en-GB writes September as "Sept", the designs say "Sep".
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const utc = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
const dayMonth = (date: Date) => `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;

export const formatCount = (n: number) => COUNT.format(n);

/** "Sat 24 Oct" for a UTC "YYYY-MM-DD". */
export const formatDay = (isoDate: string) => `${WEEKDAYS[utc(isoDate).getUTCDay()]} ${dayMonth(utc(isoDate))}`;

/** "30 Sep" for a UTC "YYYY-MM-DD". */
export const formatDayMonth = (isoDate: string) => dayMonth(utc(isoDate));

/** "12 Aug 2026". */
export const formatDate = (ms: number) => `${dayMonth(new Date(ms))} ${new Date(ms).getUTCFullYear()}`;

/** "Ghana" for "GH". Null (Cloudflare couldn't place the scan) is "Somewhere else". */
export function countryName(code: string | null): string {
	if (!code) return "Somewhere else";
	try {
		return REGION.of(code) ?? code;
	} catch {
		return code;
	}
}

/** "https://kofi-chops.com/menu/" as "kofi-chops.com/menu". */
export function prettyUrl(url: string): string {
	return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** "2 min ago", "3 hours ago", "Yesterday", "12 Aug"; "Not yet" when never. */
export function timeAgo(ms: number | null, now: number): string {
	if (ms === null) return "Not yet";
	const minutes = Math.floor((now - ms) / 60_000);
	if (minutes < 1) return "Just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "Yesterday";
	if (days < 7) return `${days} days ago`;
	return dayMonth(new Date(ms));
}
