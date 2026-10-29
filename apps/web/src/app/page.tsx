import { Generator } from "@/components/generator/generator";
import { Hero } from "@/components/hero";
import { ProofStrip } from "@/components/proof-strip";
import { SiteNav } from "@/components/site-nav";
import { currentUser } from "@/lib/server/session";

export default async function Home({ searchParams }: PageProps<"/">) {
	const user = await currentUser();
	// "New code" on /app links here with ?dynamic=on so the generator starts with Dynamic on.
	const startDynamic = (await searchParams).dynamic === "on";
	return (
		<>
			<SiteNav user={user} page="create" />
			<main>
				<Hero />
				<Generator signedIn={user !== null} startDynamic={startDynamic} />
				<ProofStrip />
			</main>
		</>
	);
}
