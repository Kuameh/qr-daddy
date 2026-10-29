# Third-party notices

QR Daddy includes or depends on the software below. Each part keeps its own licence. The
licence for QR Daddy itself has not been decided yet.

## QR Code generator library (vendored)

`packages/qr/src/encode/qrcodegen.ts` is the TypeScript port of
[nayuki/QR-Code-generator](https://github.com/nayuki/QR-Code-generator), changed only to
add `export`. Its notice, copied from the file header:

```
QR Code generator library (TypeScript)

Copyright (c) Project Nayuki. (MIT License)
https://www.nayuki.io/page/qr-code-generator-library

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:
- The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.
- The Software is provided "as is", without warranty of any kind, express or
  implied, including but not limited to the warranties of merchantability,
  fitness for a particular purpose and noninfringement. In no event shall the
  authors or copyright holders be liable for any claim, damages or other
  liability, whether in an action of contract, tort or otherwise, arising from,
  out of or in connection with the Software or the use or other dealings in the
  Software.
```

## Runtime dependencies

Packages that ship to users, from the `dependencies` in `packages/qr/package.json` and
`apps/web/package.json`, with the versions in `pnpm-lock.yaml` at the time of writing.
Their full licence texts are in each package's `LICENSE` file under `node_modules`.

| Package | Version | Licence | Copyright | Used by |
|---|---|---|---|---|
| [pdf-lib](https://github.com/Hopding/pdf-lib) | 1.17.1 | MIT | 2019 Andrew Dillon | `@qr-daddy/qr/pdf` |
| [@pdf-lib/standard-fonts](https://github.com/Hopding/standard-fonts) | 1.0.0 | MIT | 2018 Andrew Dillon | pdf-lib |
| [@pdf-lib/upng](https://github.com/Hopding/upng) | 1.0.1 | MIT | 2017 Photopea | pdf-lib (PNG logos) |
| [pako](https://github.com/nodeca/pako) | 1.0.11 | MIT and Zlib | 2014–2017 Vitaly Puzrin and Andrei Tuputcyn | pdf-lib |
| [tslib](https://github.com/microsoft/tslib) | 1.14.1 | 0BSD | Microsoft Corporation | pdf-lib |
| [Next.js](https://github.com/vercel/next.js) | 16.4.3 | MIT | 2025 Vercel, Inc. | `apps/web` |
| [React](https://github.com/facebook/react) and React DOM | 19.3.1 | MIT | Meta Platforms, Inc. and affiliates | `apps/web` |
| [@phosphor-icons/react](https://github.com/phosphor-icons/react) | 2.1.10 | MIT | 2020 Phosphor Icons | `apps/web` |

Next.js and React bring their own dependencies (for example `scheduler` and
`@swc/helpers`), all under their own licences in `node_modules`.

## Fonts

Self-hosted by `next/font/google` at build time.

| Font | Licence |
|---|---|
| [Geist](https://github.com/vercel/geist-font) | SIL Open Font License 1.1 |
| [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) | SIL Open Font License 1.1 |
