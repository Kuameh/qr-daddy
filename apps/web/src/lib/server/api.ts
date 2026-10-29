import type { Failure } from "@qr-daddy/core";

// Route handlers answer failures with `{ message, details? }`. `message` is plain copy the
// client shows as-is; `details` is an optional second sentence.

export const OUTAGE_MESSAGE = "Something went wrong on our side. Try again in a minute.";
export const SIGNED_OUT_MESSAGE = "You've been signed out. Sign in again to keep going.";

export function apiError(status: number, message: string, details?: string): Response {
	return Response.json(details ? { message, details } : { message }, { status });
}

const STATUS: Record<string, number> = { not_found: 404, rate_limited: 429 };

/** A core failure (user-fixable, plain message) as a response: 404, 429 or 400. */
export function failureResponse(failure: Failure<string>): Response {
	return apiError(STATUS[failure.code] ?? 400, failure.message);
}

/**
 * Runs a handler and turns anything it throws (D1, KV or email outages) into a plain 500.
 * The error is logged for us; the user gets a sentence they can act on.
 */
export async function handle(run: () => Promise<Response>): Promise<Response> {
	try {
		return await run();
	} catch (error) {
		console.error(error);
		return apiError(500, OUTAGE_MESSAGE);
	}
}

/** The request's JSON body as an object, or null when it isn't one. */
export async function jsonBody(request: Request): Promise<Record<string, unknown> | null> {
	const body: unknown = await request.json().catch(() => null);
	return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
