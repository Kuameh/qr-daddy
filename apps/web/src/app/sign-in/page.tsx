import type { MagicLinkFailure } from "@qr-daddy/core";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SiteNav } from "@/components/site-nav";
import { safeNextPath } from "@/lib/safe-next";
import { currentUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sign in · QR Daddy" };

const LINK_FAILURES: MagicLinkFailure[] = ["expired", "used", "unknown"];

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
	const params = await searchParams;
	const next = safeNextPath(typeof params.next === "string" ? params.next : null);
	if (await currentUser()) redirect(next);

	const link = LINK_FAILURES.find((failure) => failure === params.link) ?? null;
	return (
		<>
			<SiteNav user={null} page="sign-in" />
			<main className="mx-auto flex max-w-110 flex-col px-4 pt-7 pb-16 md:px-0 md:pt-28">
				<SignInForm next={next} linkFailure={link} />
			</main>
		</>
	);
}
