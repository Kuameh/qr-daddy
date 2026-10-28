# QR Daddy design system · v1.0

QR Daddy is a calm tool with a loud voice. The working surface (the generator) is
neutral, precise and quiet, like Linear. Personality lives in a few deliberate places:
the heavy Bricolage display type, hard ink shadows on stickers and the primary action,
and the QR codes themselves. Cobalt is the only accent colour.

Source of truth: `apps/web/src/app/globals.css` (`@theme` tokens) and
`apps/web/src/lib/qr-palette.ts` (colours baked into QR files). Visual companion:
[`design-system.html`](design-system.html). Design files: Brilliant project `qr-daddy`,
canvas **QR Daddy — Final**.

## 1. Design tokens

### Colour

| Token | Value | Usage |
|---|---|---|
| `paper` | `#F7F7F5` | Page background |
| `surface` | `#FFFFFF` | Panels, cards, inputs, stickers |
| `surface-sunken` | `#FBFBFA` | The preview well behind the QR code |
| `chip` | `#F1F1EE` | Unselected chips |
| `ink` | `#111114` | Text, selected chips, step numbers, hard shadows, borders on loud elements |
| `ink-soft` | `#55555C` | Secondary text, nav links |
| `muted` | `#6B6B72` | Captions, hints |
| `line` | `#E6E6E1` | Panel borders, dividers |
| `line-strong` | `#D9D9D3` | Input and tile borders |
| `line-dashed` | `#CFCFC8` | The dashed logo drop zone |
| `accent` | `#2B4BFF` | **One job:** the primary action, the active step, the dynamic feature |
| `accent-tint` | `#EEF1FF` | Background of the Dynamic row |
| `accent-soft` | `#DDE3FF` | Chart bars, the soft sticker |
| `danger` | `#C8102E` | Errors (icon and text) |
| `warning` | `#B45309` | Warnings, the Dev badge |
| `warning-tint` | `#FFF4E5` | Warning callout background |

No dark mode yet. Every colour is a token, so dark mode is a second `@theme` block when it comes.

### QR palette (`qr-palette.ts`)

These are literal values because they are written into downloaded PNG and SVG files.

| Name | Value | Notes |
|---|---|---|
| Ink | `#111114` | Default. Ink codes get cobalt eyes (`QR_ACCENT_EYE`) |
| Cobalt | `#2B4BFF` | |
| Forest | `#0F7B55` | |
| Clay | `#C2410C` | |
| Slate | `#6B6B72` | |
| Background | `#FFFFFF` | Codes are always dark on white in the generator |
| Placeholder | `#E4E4DF` | The ghost code in the empty state |

Custom colours come from the native colour picker. Codes stay dark-on-light; inverted
codes scan on fewer phones.

### Typography

| Family | Token | Use |
|---|---|---|
| Geist (400, 500) | `font-sans` | Everything you read: UI, body, inputs |
| Bricolage Grotesque (800 only) | `font-display` | Headlines, step titles, the wordmark, big numbers |

Two Geist weights, one display weight. Never use bold to signal importance; make it bigger.

| Style | Specs | Usage |
|---|---|---|
| `text-display-xl` | 80px / 0.94 / -0.0375em, display 800 | Desktop hero headline |
| `text-display-lg` | 44px / 0.95 / -0.045em, display 800 | Mobile hero headline |
| `text-display-md` | 40px / 1 / -0.0375em, display 800 | Stat numbers ("1,284 scans") |
| `text-2xl` display | 24px, display 800, `tracking-tight` | Card titles, wordmark |
| `text-step` | 20px / 1.2 / -0.025em, display 800 | Step titles ("What's it for?") |
| `text-lg` | 18px / 1.5 | Hero subtitle (desktop) |
| `text-base` | 16px / 1.5 | Body, inputs (always 16px on phones) |
| `text-sm` | 14px | Labels, chips, buttons on desktop, nav |
| `text-xs` | 12px | Pattern tile captions |
| `text-badge` | 10px / 16px, uppercase | The Dev badge only |

### Spacing, radius, shadow

- **Spacing:** Tailwind's 4px scale. Page gutter 16px on phones, 40px on desktop. Panel padding 16px / 24px. Stack gaps 12–20px.
- **Radius:** `rounded-xl` (12px) inputs and buttons, `rounded-2xl` (16px) panels and cards, `rounded-3xl` (24px) stickers, `rounded-full` chips and swatches.
- **Hard shadows** (the B-direction signature, ink, no blur):

| Token | Value | Usage |
|---|---|---|
| `shadow-hard-sm` | `4px 4px 0 ink` | Primary button |
| `shadow-hard` | `6px 6px 0 ink` | Stickers, the phone preview |
| `shadow-hard-lg` | `8px 8px 0 ink` | The desktop preview sticker, hero stickers |

A hard shadow always comes with a 2–3px ink border. Panels never get shadows; they get a 1px `line` border.

## 2. Iconography

Phosphor (`@phosphor-icons/react`), regular weight, 18–24px. In use: `List`, `X`,
`ArrowLeft`, `UploadSimple`, `WarningCircle`. Don't add another icon set.

## 3. Layout

- **Breakpoints:** phone under 768px (`md`), desktop from 768px; the hero sticker collage appears from 1024px (`lg`).
- **Home, desktop:** nav (72px) → hero (headline max 640px, collage 520×400) → generator (controls 440px fixed, preview fills) → proof strip (three equal cards).
- **Home, phone:** nav (60px) → hero → generator as three steps, one at a time, with the preview on top and the step buttons pinned to the bottom → proof cards stacked.

## 4. Components

### Generator (`components/generator/generator.tsx`)
- **Step heading:** 28px ink circle with the number in display 14px white, then the title in `text-step`.
- **Content chips:** 44px tall on phones, 36px on desktop; selected = `bg-ink text-surface`, else `bg-chip`.
- **Inputs:** 48px phones / 46px desktop, `rounded-xl`, `border-line-strong`, focus `border-ink`, 16px text.
- **Pattern tiles:** 64px; selected = 2px ink border, else 1px `line-strong`. Glyph 18px.
- **Colour swatches:** 44px target (36px desktop), selected = 2px ink ring.
- **Logo:** dashed drop zone → once added, thumbnail + Small / Medium / Large chips. Sizes are 18%, 22%, 26% of the code width, all proven to scan in `packages/qr/test/render.test.ts`; that is why there is no free slider.
- **Preview sticker:** `surface`, 3px ink border, `rounded-3xl`, hard shadow; 224px on phones, 360px on desktop.
- **Step bar (phone):** three 6px segments: done `ink`, current `accent`, next `line`.

### Buttons
- **Primary:** `bg-accent`, white text, 2px ink border, `shadow-hard-sm`; 52px phones / 44px desktop. Disabled: 40% opacity, no shadow.
- **Secondary:** `surface`, 2px ink border, same heights.

### States
| State | What shows |
|---|---|
| Empty | Ghost code in `#E4E4DF` + "Paste a link to see your code." (wording per content type) |
| Too long | Danger icon + "That's too much to fit in one QR code. Make it shorter." Downloads disabled |
| Logo file too big | "That logo file is too big. Use one under 2 MB." |
| Colour too light | Custom colour under 3:1 contrast with white (`MIN_SCAN_CONTRAST`): `warning-tint` callout under the swatches + warning-coloured status, "This colour is too light for some phones to read. Pick a darker one." Downloads stay enabled |

### Dev badge (`components/dev-mode-badge.tsx`)
Dashed `warning` border, `text-badge`, uppercase "DEV". On every surface of an unreleased
feature (nav items, Dynamic row, MoMo chip, proof cards), shown only when
`NEXT_PUBLIC_DEV_MODE=true`.

## 5. Micro-interactions

None yet. The first motion pass will cover chip and step transitions and the sticker on
code changes.

## 6. Implementation notes

- No hex literals or arbitrary values (`text-[13px]`) in components; add a token here and in `globals.css` first. Data-driven inline styles (swatch colours, chart heights) are the exception.
- Touch targets 44px minimum on phones; inputs 16px on phones.
- Generated QR SVGs render through `<QrArt>`; they come from our renderer, never from user markup.
- Error copy follows the plain-language rule: what happened, then what to do.

## Changelog

- **v1.0 · 2026-10-28** First version, from the merge of direction A (Workbench) and B (Loud) without B's yellow.
