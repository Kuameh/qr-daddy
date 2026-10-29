import type { Metadata } from "next";
import { SiteNav } from "@/components/site-nav";
import { primaryButton } from "@/components/ui/buttons";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Sign in · QR Daddy", robots: { index: false } };

/**
 * Where the emailed sign-in link lands. Mail scanners (Outlook Safe Links, corporate gateways)
 * open links to check them; if opening the link signed you in, they would use up the single-use
 * token first. So the link only shows this page, and the button sends the token.
 */
export default async function ContinueSignInPage({ searchParams }: PageProps<"/auth/continue">) {
	const params = await searchParams;
	const token = typeof params.token === "string" ? params.token : "";
	const next = safeNextPath(typeof params.next === "string" ? params.next : null);

	return (
		<>
			<SiteNav user={null} page="sign-in" />
			<main className="mx-auto flex max-w-110 flex-col gap-6 px-4 pt-7 pb-16 md:px-0 md:pt-28">
				<h1 className="font-display text-display-lg">Almost there.</h1>
				<form method="post" action="/auth/verify" className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-6">
					<p className="text-base text-ink-soft">Press the button to finish signing in on this device.</p>
					<input type="hidden" name="token" value={token} />
					<input type="hidden" name="next" value={next} />
					<button type="submit" className={primaryButton}>Continue to QR Daddy</button>
				</form>
			</main>
		</>
	);
}
