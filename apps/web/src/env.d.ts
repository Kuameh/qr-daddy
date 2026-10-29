// Secrets aren't in wrangler.jsonc, so `wrangler types` can't see them. Set with
// `wrangler secret put RESEND_API_KEY`; absent in local dev, where sign-in links are printed.
interface CloudflareEnv {
	RESEND_API_KEY?: string;
}
