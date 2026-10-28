import { Generator } from "@/components/generator/generator";
import { Hero } from "@/components/hero";
import { ProofStrip } from "@/components/proof-strip";
import { SiteNav } from "@/components/site-nav";

export default function Home() {
	return (
		<>
			<SiteNav />
			<main>
				<Hero />
				<Generator />
				<ProofStrip />
			</main>
		</>
	);
}
