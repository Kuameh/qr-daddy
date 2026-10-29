# QR Daddy

QR code generator: free static codes in the browser, no account needed; dynamic codes, scan
analytics and magic-link sign-in for people who sign in (Cloudflare Workers, D1, KV; email through Resend). App at
`qr.ashiangmor.com`, short links at `q.ashiangmor.com`.

## Layout

- `packages/qr`: encoder, renderer and content builders. `src/encode/qrcodegen.ts` is vendored from nayuki/QR-Code-generator with only `export` added; keep it that way so upstream fixes merge cleanly.
- `apps/web`: Next.js 16 + Tailwind 4 on Cloudflare Workers through the OpenNext adapter (`wrangler.jsonc`: D1 `DB`, KV `LINKS`; secret `RESEND_API_KEY` for sign-in emails, set with `wrangler secret put RESEND_API_KEY`, typed in `src/env.d.ts`). Read `apps/web/AGENTS.md` (written by Next) before changing Next APIs. Bindings come from `getCloudflareContext` (`src/lib/server/cloudflare.ts`); rerun `pnpm --filter @qr-daddy/web cf-typegen` after changing bindings.
- `packages/core`: domain layer for dynamic codes, magic-link sign-in and scan analytics on D1 + KV. The API and its rules are in the header of `src/index.ts`. D1 migrations live in `packages/core/migrations`.
- `apps/go`: redirect Worker for `q.ashiangmor.com`. Binding ids in both `wrangler.jsonc` files are the real production D1 and KV ids (account "Launchpad Tech"): anything with `--remote`, or a deploy, touches live data. Rerun `pnpm --filter @qr-daddy/go cf-typegen` after changing bindings.

## Commands

- `pnpm test`: all tests. `packages/qr` checks parity with upstream and that every pattern and logo size scans (ZXing).
- `pnpm typecheck`
- `pnpm --filter @qr-daddy/web build`: Next build. `pnpm --filter @qr-daddy/web cf:build`: the Worker bundle in `apps/web/.open-next`.

### Full stack locally

The web app and the redirect Worker share one local D1 + KV in `.wrangler/state` at the repo root,
so a code made in the app resolves in the Worker.

1. `pnpm --filter @qr-daddy/go db:migrate:local`: apply `packages/core/migrations` to the shared local D1.
2. `pnpm --filter @qr-daddy/web dev`: app on http://localhost:3100 (`next dev`, bindings from a local miniflare).
3. `pnpm --filter @qr-daddy/go dev`: redirect Worker on http://localhost:8787 (`curl -i localhost:8787/<slug>`).
4. Sign in: the email isn't sent locally. The sign-in link is printed in the web app's terminal
   (`[qr-daddy] Sign-in link for …`).

`pnpm --filter @qr-daddy/web cf:preview` builds and runs the real Worker bundle on port 3100 against the same state.
Never `--remote` and never deploy without the owner's go-ahead. Cloudflare resources live in the account "Launchpad Tech": D1 `qr-daddy-db`, KV `qr-daddy-links`. Run wrangler through the project: `pnpm --filter @qr-daddy/web exec wrangler …` (it isn't installed globally).

## Data rules

- Every query that touches a user's data filters by `user_id`, and `userId` comes from `getSession`, never from request input.
- Store only SHA-256 hashes of sign-in link tokens and session tokens.
- The emailed link opens `/auth/continue`, a page with a button; only its POST to `/auth/verify` uses the token. Mail scanners open links, so a GET must never sign anyone in.
- KV `LINKS` holds slug -> `{ codeId, destination }`; D1 is the source of truth and every destination change or delete writes through to KV.
- Sign-in links: at most 3 per email per 15 minutes (`requestMagicLink`). The session cookie `qd_session` is HttpOnly, Secure, SameSite=Lax.
- Making and downloading a code never needs an account. Only Dynamic asks for one, and says what it gives.
- `NEXT_PUBLIC_DEV_MODE=true` shows unreleased features (Pricing, MoMo) with a Dev badge.

## Doc index

- Design system: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) + [docs/design-system.html](docs/design-system.html). Update both together. Designs: Brilliant project `qr-daddy`, canvases "QR Daddy — Final" (home, generator) and "QR Daddy — Account" (sign-in, Your codes, code detail).

## Rules

- No hex literals or arbitrary Tailwind values in components; tokens live in `apps/web/src/app/globals.css`, QR file colours in `apps/web/src/lib/qr-palette.ts`.
- Only offer QR styles the scan tests cover. A new pattern or logo size needs a case in `packages/qr/test/render.test.ts` first.
- Test decoding with ZXing, not jsQR: jsQR misreads dot and rounded codes that phones read.
