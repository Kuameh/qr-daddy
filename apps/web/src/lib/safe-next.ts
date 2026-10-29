/**
 * `next` from a query string, kept only when it is a path on this site. Anything else
 * (another origin, `//evil.example`, `/\evil.example`, a non-path) falls back.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/app"): string {
	if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
	const url = URL.parse(next, "https://qr.invalid");
	if (!url || url.origin !== "https://qr.invalid") return fallback;
	return `${url.pathname}${url.search}${url.hash}`;
}
