import { cancelMagicLink, normalizeEmail, requestMagicLink } from "@qr-daddy/core";
import { apiError, failureResponse, handle, jsonBody } from "@/lib/server/api";
import { cloudflareEnv } from "@/lib/server/cloudflare";
import { isLocalRequest, linkOrigin } from "@/lib/server/origin";
import { safeNextPath } from "@/lib/safe-next";
import { signInEmail } from "@/emails/sign-in-email";

// Sent through Resend (free tier). qr.ashiangmor.com is verified there; the key is a Worker secret.
const SENDER = "QR Daddy <signin@qr.ashiangmor.com>";

/** Emails a sign-in link. Body: `{ email, next? }`. Answers `{ email }`, the address it went to. */
export async function POST(request: Request) {
	return handle(async () => {
		const body = await jsonBody(request);
		const email = typeof body?.email === "string" ? body.email : "";
		const next = safeNextPath(typeof body?.next === "string" ? body.next : null);

		const env = await cloudflareEnv();
		const deps = { db: env.DB, kv: env.LINKS };
		const result = await requestMagicLink(deps, email);
		if (!result.ok) return failureResponse(result);

		const to = normalizeEmail(email)!;
		const link = `${linkOrigin(request)}/auth/continue?${new URLSearchParams({ token: result.value.token, next })}`;
		// Local runs have no real inbox: the link goes to the terminal running the app, and
		// nothing is sent unless a Resend key is set for that run.
		if (isLocalRequest(request)) {
			console.info(`\n[qr-daddy] Sign-in link for ${to}:\n${link}\n`);
			if (!env.RESEND_API_KEY) return Response.json({ email: to });
		}

		const sent = env.RESEND_API_KEY
			? await fetch("https://api.resend.com/emails", {
					method: "POST",
					headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
					body: JSON.stringify({ from: SENDER, to: [to], ...signInEmail(link) }),
				})
			: null;
		if (!sent?.ok) {
			console.error("Sign-in email failed", sent ? `${sent.status} ${await sent.text()}` : "RESEND_API_KEY is not set");
			// The link never arrived, so it shouldn't count toward the person's 3 links per 15 minutes.
			await cancelMagicLink(deps, result.value.token);
			return apiError(502, "We couldn't send your sign-in email.", "Check the address is right, then try again in a minute.");
		}
		return Response.json({ email: to });
	});
}
