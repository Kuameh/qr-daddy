import { APP_ORIGIN } from "@qr-daddy/core";

/** True when the request came to this machine: `next dev` or a local `wrangler dev` preview. */
export function isLocalRequest(request: Request): boolean {
	const { hostname } = new URL(request.url);
	return hostname === "localhost" || hostname === "127.0.0.1";
}

/**
 * Where links in emails point. Local runs link back to themselves; everywhere else uses the
 * real app origin, so a forged Host header can't send sign-in links to another site.
 */
export function linkOrigin(request: Request): string {
	return isLocalRequest(request) ? new URL(request.url).origin : APP_ORIGIN;
}
