import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Deps } from "@qr-daddy/core";

/** Worker bindings from wrangler.jsonc. In `next dev` they come from the local miniflare. */
export async function cloudflareEnv(): Promise<CloudflareEnv> {
	return (await getCloudflareContext({ async: true })).env;
}

/** What every @qr-daddy/core function takes first. */
export async function coreDeps(): Promise<Deps> {
	const env = await cloudflareEnv();
	return { db: env.DB, kv: env.LINKS };
}
