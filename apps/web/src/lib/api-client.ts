// Browser side of the `{ message, details? }` contract in lib/server/api.ts.

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string; details?: string };

const OFFLINE = "We couldn't reach QR Daddy. Check your internet connection and try again.";
const OUTAGE = "Something went wrong on our side. Try again in a minute.";

/** Calls one of our route handlers with a JSON body and returns its data or its plain failure copy. */
export async function apiRequest<T>(url: string, method: string, body?: unknown): Promise<ApiResult<T>> {
	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers: body === undefined ? undefined : { "Content-Type": "application/json" },
			body: body === undefined ? undefined : JSON.stringify(body),
		});
	} catch {
		return { ok: false, status: 0, message: OFFLINE };
	}
	const payload = (await response.json().catch(() => null)) as { message?: string; details?: string } | null;
	if (response.ok) return { ok: true, data: payload as T };
	// Our handlers always write plain copy; a response without it came from somewhere else.
	if (!payload?.message) return { ok: false, status: response.status, message: OUTAGE };
	return { ok: false, status: response.status, message: payload.message, details: payload.details };
}

/** One line of copy for a failure: the message, then the details sentence when there is one. */
export function getApiErrorText(failure: { message: string; details?: string }): string {
	return failure.details ? `${failure.message} ${failure.details}` : failure.message;
}
