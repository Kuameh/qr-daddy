# QR Daddy

A QR code generator. Today it makes free static codes for links, Wi-Fi, contacts, SMS and
email, styled with a pattern, a colour and an optional logo, and downloads them as PNG,
SVG or PDF. Everything runs in the browser; nothing you type is sent anywhere.

Dynamic codes (change the destination after printing), scan analytics and magic-link
sign-in are planned, on Cloudflare Workers, D1, KV and Analytics Engine. They show only in
dev mode for now.

The app is at `qr.ashiangmor.com`, with short links at `q.ashiangmor.com`.

## Layout

pnpm workspace, Node 22 or later.

| Path | What it holds |
|---|---|
| `packages/qr` | `@qr-daddy/qr`: encoder, renderers and content builders |
| `packages/qr/src/encode/qrcodegen.ts` | The encoder, vendored from [nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator) with only `export` added |
| `packages/qr/src/render` | `toSvg` and `toPdf` (`@qr-daddy/qr/pdf`), drawing from one shared layout |
| `packages/qr/src/payloads.ts` | Builders for Wi-Fi, contact, SMS and email payloads |
| `packages/qr/test` | Upstream parity, payloads, and scan tests that decode every style with ZXing |
| `apps/web` | `@qr-daddy/web`: the site, Next.js 16 and Tailwind 4 |
| `docs` | Design system |

## Run, test, build

```sh
pnpm install
pnpm --filter @qr-daddy/web dev     # http://localhost:3100
pnpm test                           # all packages
pnpm typecheck
pnpm --filter @qr-daddy/web build
```

Set `NEXT_PUBLIC_DEV_MODE=true` to show unreleased features, each marked with a Dev badge.

The PDF scan tests rasterise with Ghostscript (`gs`). Without it they are skipped and only
the page-size checks run; install it with `brew install ghostscript` or your package manager.

## Design

- Design system: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), with a visual companion in
  [docs/design-system.html](docs/design-system.html). The two are updated together.
- Tokens: `apps/web/src/app/globals.css`. Colours written into QR files:
  `apps/web/src/lib/qr-palette.ts`.
- Designs: Brilliant project `qr-daddy`, canvas "QR Daddy — Final".

## Credits

- QR encoding: [QR Code generator library](https://www.nayuki.io/page/qr-code-generator-library)
  by Project Nayuki, MIT License.
- PDF output: [pdf-lib](https://pdf-lib.js.org) by Andrew Dillon, MIT License.
- Type: Geist by Vercel and Bricolage Grotesque by Mathieu Triay, both SIL Open Font License 1.1.
- Icons: [Phosphor](https://phosphoricons.com), MIT License.

Full notices for third-party code are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licence

The licence for QR Daddy itself has not been decided yet. The third-party parts listed in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) keep their own licences.
