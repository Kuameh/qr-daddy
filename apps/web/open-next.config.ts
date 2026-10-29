import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache: every page that needs data renders per request, and the rest are static assets.
export default defineCloudflareConfig({});
