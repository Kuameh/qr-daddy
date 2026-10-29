import { SESSION_COOKIE, verifyMagicLink } from "@qr-daddy/core";
import { NextResponse, type NextRequest } from "next/server";
import { coreDeps } from "@/lib/server/cloudflare";
import { safeNextPath } from "@/lib/safe-next";

/**
 * Finishes sign-in from the /auth/continue form: uses up the link token, starts a session and
 * goes on to `next`, or back to /sign-in to explain. POST only, so link scanners that open the
 * emailed link can't use the token up.
 */
export async function POST(request: NextRequest) {
	const form = await request.formData();
	const token = String(form.get("token") ?? "");
	const next = safeNextPath(String(form.get("next") ?? ""));

	const result = await verifyMagicLink(await coreDeps(), token);
	if (!result.ok) {
		const back = new URL("/sign-in", request.url);
		back.searchParams.set("link", result.code);
		back.searchParams.set("next", next);
		return NextResponse.redirect(back, 303);
	}

	const response = NextResponse.redirect(new URL(next, request.url), 303);
	response.cookies.set(SESSION_COOKIE, result.value.sessionToken, {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		path: "/",
		expires: new Date(result.value.expiresAt),
	});
	response.headers.set("Cache-Control", "no-store");
	return response;
}
