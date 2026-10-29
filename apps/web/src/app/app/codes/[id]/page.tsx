import { getCode, scanSummary } from "@qr-daddy/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CodeDetail } from "@/components/codes/code-detail";
import { ScanAnalytics } from "@/components/codes/scan-analytics";
import { codeName } from "@/components/generator/content";
import { SiteNav } from "@/components/site-nav";
import { formatCount, formatDate } from "@/lib/format";
import { coreDeps } from "@/lib/server/cloudflare";
import { requireUser } from "@/lib/server/session";

export const metadata: Metadata = { title: "Your code · QR Daddy" };

export default async function CodePage({ params }: PageProps<"/app/codes/[id]">) {
	const { id } = await params;
	const user = await requireUser(`/app/codes/${id}`);
	const deps = await coreDeps();
	const code = await getCode(deps, user.id, id);
	if (!code) notFound();
	// Static codes have no scans, so they skip the summary query.
	const summary = code.kind === "dynamic" ? await scanSummary(deps, user.id, id, { days: 30 }) : null;

	return (
		<>
			<SiteNav user={user} page="codes" />
			<main className="mx-auto flex w-full max-w-page flex-col gap-6 px-4 pt-5 pb-16 md:px-10 md:pt-6">
				<CodeDetail
					code={code}
					name={codeName(code)}
					madeOn={formatDate(code.createdAt)}
					allTimeScans={formatCount(summary?.allTime ?? 0)}
					analytics={summary && <ScanAnalytics summary={summary} />}
				/>
			</main>
		</>
	);
}
