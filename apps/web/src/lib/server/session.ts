import { getSession, SESSION_COOKIE, type User } from "@qr-daddy/core";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { coreDeps } from "./cloudflare";

/** The signed-in user for this request, or null. Looked up once per request. */
export const currentUser = cache(async (): Promise<User | null> => {
	const token = (await cookies()).get(SESSION_COOKIE)?.value;
	if (!token) return null;
	return (await getSession(await coreDeps(), token))?.user ?? null;
});

/** The signed-in user, or a redirect to sign in that comes back to `returnTo`. */
export async function requireUser(returnTo: string): Promise<User> {
	const user = await currentUser();
	if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
	return user;
}
