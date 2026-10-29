import { createCode, type ContentType } from "@qr-daddy/core";
import { apiError, failureResponse, handle, jsonBody, SIGNED_OUT_MESSAGE } from "@/lib/server/api";
import { coreDeps } from "@/lib/server/cloudflare";
import { currentUser } from "@/lib/server/session";

/**
 * Saves a code for the signed-in user. Body: `{ kind?, contentType?, destination, title?, style? }`;
 * `kind` is "dynamic" (default) or "static". A static code saved again answers the existing one.
 */
export async function POST(request: Request) {
	return handle(async () => {
		const user = await currentUser();
		if (!user) return apiError(401, SIGNED_OUT_MESSAGE);
		const body = await jsonBody(request);
		const result = await createCode(await coreDeps(), user.id, {
			kind: body?.kind === "static" ? "static" : "dynamic",
			// Checked by createCode.
			contentType: typeof body?.contentType === "string" ? (body.contentType as ContentType) : undefined,
			destination: typeof body?.destination === "string" ? body.destination : "",
			title: typeof body?.title === "string" ? body.title : null,
			style: body?.style ?? null,
		});
		return result.ok ? Response.json(result.value, { status: 201 }) : failureResponse(result);
	});
}
