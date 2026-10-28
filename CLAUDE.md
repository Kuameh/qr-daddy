# QR Daddy

QR code generator: free static codes in the browser now; dynamic codes, scan analytics and
magic-link sign-in later (Cloudflare Workers, D1, KV, Analytics Engine). App at
`qr.ashiangmor.com`, short links at `q.ashiangmor.com`.

## Layout

- `packages/qr`: encoder, renderer and content builders. `src/encode/qrcodegen.ts` is vendored from nayuki/QR-Code-generator with only `export` added; keep it that way so upstream fixes merge cleanly.
- `apps/web`: Next.js 16 + Tailwind 4. Read `apps/web/AGENTS.md` (written by Next) before changing Next APIs.

## Commands

- `pnpm test`: all tests. `packages/qr` checks parity with upstream and that every pattern and logo size scans (ZXing).
- `pnpm typecheck`
- `pnpm --filter @qr-daddy/web dev`: app on http://localhost:3100. `NEXT_PUBLIC_DEV_MODE=true` shows unreleased features with a Dev badge.

## Doc index

- Design system: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) + [docs/design-system.html](docs/design-system.html). Update both together. Designs: Brilliant project `qr-daddy`, canvas "QR Daddy — Final".

## Rules

- No hex literals or arbitrary Tailwind values in components; tokens live in `apps/web/src/app/globals.css`, QR file colours in `apps/web/src/lib/qr-palette.ts`.
- Only offer QR styles the scan tests cover. A new pattern or logo size needs a case in `packages/qr/test/render.test.ts` first.
- Test decoding with ZXing, not jsQR: jsQR misreads dot and rounded codes that phones read.
