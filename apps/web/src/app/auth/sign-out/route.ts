import { SESSION_COOKIE, signOut } from "@qr-daddy/core";
import { NextResponse, type NextRequest } from "next/server";
import { coreDeps } from "@/lib/server/cloudflare";

/** The account menu's Sign out form posts here. Ends the session and goes home. */
export async function POST(request: NextRequest) {
	const token = request.cookies.get(SESSION_COOKIE)?.value;
	if (token) await signOut(await coreDeps(), token);
	const response = NextResponse.redirect(new URL("/", request.url), 303);
	response.cookies.delete(SESSION_COOKIE);
	return response;
}
