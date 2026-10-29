import { Generator } from "@/components/generator/generator";
import { Hero } from "@/components/hero";
import { ProofStrip } from "@/components/proof-strip";
import { SiteNav } from "@/components/site-nav";
import { currentUser } from "@/lib/server/session";

export default async function Home() {
	const user = await currentUser();
	return (
		<>
			<SiteNav user={user} page="create" />
			<main>
				<Hero />
				<Generator signedIn={user !== null} />
				<ProofStrip />
			</main>
		</>
	);
}
