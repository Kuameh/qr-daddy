import { createCode } from "@qr-daddy/core";
import { apiError, failureResponse, handle, jsonBody, SIGNED_OUT_MESSAGE } from "@/lib/server/api";
import { coreDeps } from "@/lib/server/cloudflare";
import { currentUser } from "@/lib/server/session";

/** Creates a dynamic code for the signed-in user. Body: `{ destination, title?, style? }`. Answers the code. */
export async function POST(request: Request) {
	return handle(async () => {
		const user = await currentUser();
		if (!user) return apiError(401, SIGNED_OUT_MESSAGE);
		const body = await jsonBody(request);
		const result = await createCode(await coreDeps(), user.id, {
			destination: typeof body?.destination === "string" ? body.destination : "",
			title: typeof body?.title === "string" ? body.title : null,
			style: body?.style ?? null,
		});
		return result.ok ? Response.json(result.value, { status: 201 }) : failureResponse(result);
	});
}
