import { deleteCode, updateCode, type CodePatch } from "@qr-daddy/core";
import { apiError, failureResponse, handle, jsonBody, SIGNED_OUT_MESSAGE } from "@/lib/server/api";
import { coreDeps } from "@/lib/server/cloudflare";
import { currentUser } from "@/lib/server/session";

/** Changes the user's code. Body: any of `{ destination, title, style, logo }`. Answers the updated code. */
export async function PATCH(request: Request, { params }: RouteContext<"/api/codes/[id]">) {
	return handle(async () => {
		const user = await currentUser();
		if (!user) return apiError(401, SIGNED_OUT_MESSAGE);
		const body = (await jsonBody(request)) ?? {};
		const patch: CodePatch = {};
		if (typeof body.destination === "string") patch.destination = body.destination;
		if (typeof body.title === "string" || body.title === null) patch.title = body.title;
		if ("style" in body) patch.style = body.style;
		if (typeof body.logo === "string" || body.logo === null) patch.logo = body.logo;
		const result = await updateCode(await coreDeps(), user.id, (await params).id, patch);
		return result.ok ? Response.json(result.value) : failureResponse(result);
	});
}

/** Deletes the user's code; its short link stops working at once. */
export async function DELETE(_request: Request, { params }: RouteContext<"/api/codes/[id]">) {
	return handle(async () => {
		const user = await currentUser();
		if (!user) return apiError(401, SIGNED_OUT_MESSAGE);
		const result = await deleteCode(await coreDeps(), user.id, (await params).id);
		return result.ok ? new Response(null, { status: 204 }) : failureResponse(result);
	});
}
