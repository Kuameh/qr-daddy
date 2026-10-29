import path from "node:path";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const config: NextConfig = {
	// The QR and core packages ship TypeScript source, so Next compiles them with the app.
	transpilePackages: ["@qr-daddy/qr", "@qr-daddy/core"],
};

// `next dev` gets the wrangler.jsonc bindings (D1, KV, Email) from a local miniflare. Its state lives
// at the repo root, shared with `wrangler dev` in apps/go, so a code made here resolves there.
initOpenNextCloudflareForDev({ persist: { path: path.resolve(import.meta.dirname, "../../.wrangler/state/v3") } });

export default config;
