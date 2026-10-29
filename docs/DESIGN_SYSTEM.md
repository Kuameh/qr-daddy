# QR Daddy design system · v1.3

QR Daddy is a calm tool with a loud voice. The working surface (the generator) is
neutral, precise and quiet, like Linear. Personality lives in a few deliberate places:
the heavy Bricolage display type, hard ink shadows on stickers and the primary action,
and the QR codes themselves. Cobalt is the only accent colour.

Source of truth: `apps/web/src/app/globals.css` (`@theme` tokens) and
`apps/web/src/lib/qr-palette.ts` (colours baked into QR files). Visual companion:
[`design-system.html`](design-system.html). Design files: Brilliant project `qr-daddy`,
canvases **QR Daddy — Final** (home and generator) and **QR Daddy — Account** (sign-in,
Your codes, code detail; 18 frames).

**Product rule.** Making and downloading a static code never needs an account: every content
type, style, logo and PNG/SVG/PDF download works signed out, with no sign-in prompt in the way.
The only thing that asks for an account is turning on **Dynamic**, and it explains the benefit
(change where the code points after printing, see its scans) instead of blocking. Signing in is
a benefit, never a gate.

## 1. Design tokens

### Colour

Every colour token has a light and a dark value. Dark follows the system setting
(`prefers-color-scheme: dark`); there is no toggle yet. Components use the same class
names in both (`bg-surface`, `text-ink`); `globals.css` re-declares the variables for dark
in `@layer base`, after Tailwind's `@layer theme`, so the dark values win. Tailwind 4
utilities read `var(--color-*)` at the element, which is why overriding the variable is
enough. No `dark:` variants in components.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `paper` | `#F7F7F5` | `#131315` | Page background |
| `surface` | `#FFFFFF` | `#1C1C1F` | Panels, cards, inputs |
| `surface-sunken` | `#FBFBFA` | `#171719` | The preview well behind the QR code |
| `chip` | `#F1F1EE` | `#2A2A2E` | Unselected chips, pressed secondary button |
| `ink` | `#111114` | `#EDEDE8` | Text, selected chips, step numbers, hard shadows, borders on loud elements |
| `ink-soft` | `#55555C` | `#B4B4BB` | Secondary text, nav links |
| `muted` | `#6B6B72` | `#9A9AA2` | Captions, hints |
| `line` | `#E6E6E1` | `#2C2C30` | Panel borders, dividers |
| `line-strong` | `#D9D9D3` | `#3C3C41` | Input and tile borders |
| `line-dashed` | `#CFCFC8` | `#4C4C52` | The dashed logo drop zone |
| `ghost` | `#E4E4DF` | `#2E2E33` | The ghost code in the empty state (drawn in `currentColor`) |
| `swatch-edge` | `transparent` | `#4C4C52` | 1px ring on colour swatches, so the Ink swatch shows on a dark panel |
| `accent` | `#2B4BFF` | `#2B4BFF` | **One job:** the primary action, the active step, the dynamic feature |
| `on-accent` | `#FFFFFF` | `#FFFFFF` | Text and the toggle knob on `accent` |
| `accent-tint` | `#EEF1FF` | `#1B2042` | Background of the Dynamic row |
| `accent-soft` | `#DDE3FF` | `#242D66` | Chart bars |
| `sticker` | `#FFFFFF` | `#FFFFFF` | Sticker face (preview and hero) |
| `sticker-tint` | `#DDE3FF` | `#DDE3FF` | The soft hero sticker; matches `QR_TINT` |
| `sticker-edge` | `#111114` | `#111114` | 3px sticker border |
| `danger` | `#C8102E` | `#FF6B7D` | Errors (icon and text), the danger button, "Delete this code" |
| `on-danger` | `#FFFFFF` | `#131315` | Text on a danger button. Dark: dark text, because white on the light dark-mode red fails contrast |
| `warning` | `#B45309` | `#F0A54A` | Warnings, the Dev badge |
| `warning-tint` | `#FFF4E5` | `#2D2114` | Warning callout background |
| `scrim` | `#11111466` (ink, 40%) | `#000000A3` (black, 64%) | Dims the page behind dialogs, bottom sheets and the phone menu |

**Dark mode decisions**

- **Ink flips.** `ink` becomes a light warm grey, so every ink border and every hard
  shadow (`shadow-hard*` is built from `var(--color-ink)`) turns into a light edge on
  the dark page. The signature survives without a second set of shadow tokens.
- **Stickers are printed objects.** A sticker keeps its light-mode colours in dark: white
  face, ink edge. QR codes must stay dark on white for scanners, and the dark edge
  separates the white face from its now-light shadow. Downloads never change.
- **`on-accent` exists** because `text-surface` on cobalt would turn dark in dark mode.
  Use `text-surface` only on `bg-ink` (it inverts with it).
- **Cobalt stays the same** in both modes so it still matches the Cobalt QR colour.

Contrast in dark (WCAG): `ink` on `surface` 14.5:1, `ink-soft` 8.3:1, `muted` 6.1:1,
`danger` 6.2:1, `warning` 8.3:1 (7.6:1 on `warning-tint`), white on `accent` 5.9:1,
`on-danger` (`#131315`) on `danger` (`#FF6B7D`) 6.8:1. Light: white on `danger` 5.9:1.
Cobalt as a graphic on `surface` (the phone step bar) is 2.9:1; that bar is decorative
(`aria-hidden`) and the step heading carries the same information.

### QR palette (`qr-palette.ts`)

These are literal values because they are written into downloaded PNG and SVG files.

| Name | Value | Notes |
|---|---|---|
| Ink | `#111114` | Default. Ink codes get cobalt eyes (`QR_ACCENT_EYE`) |
| Cobalt | `#2B4BFF` | |
| Forest | `#0F7B55` | |
| Clay | `#C2410C` | |
| Slate | `#6B6B72` | |
| Background | `#FFFFFF` | Codes are always dark on white in the generator, in light and dark mode |
| Tint | `#DDE3FF` | Background of the soft hero sample (`QR_TINT`) |

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
| `shadow-hard-pressed` | `0 0 0 ink` | Primary button while pressed (zero offset, so the press slides instead of fading) |

A hard shadow always comes with a 2–3px ink border (`sticker-edge` on stickers). Panels never get shadows; they get a 1px `line` border.

## 2. Iconography

Phosphor (`@phosphor-icons/react`, `/dist/ssr` in server components), regular weight,
14–24px. In use: `List`, `X`, `ArrowLeft`, `ArrowRight`, `UploadSimple`, `WarningCircle`,
`CaretDown`, `CaretRight`, `SignOut`, `Plus`, `Copy`, `Check`, `CheckCircle`,
`DownloadSimple`, `Trash`, `EnvelopeSimple`, `DeviceMobile`, `Desktop`, `DeviceTablet`,
`Question`. Don't add another icon set.

## 3. Layout

- **Content frame:** every page section sits in `mx-auto w-full max-w-page` (`--container-page`, 80rem = 1280px) with the gutters inside, so content is at most 1200px wide and wide screens get even margins. The nav's border stays full width; its contents use the same frame.
- **Breakpoints:** phone under 768px (`md`), desktop from 768px; the hero sticker collage appears from 1024px (`lg`).
- **Home, desktop:** nav (72px) → hero (headline max 640px, collage 520×400) → generator (controls 440px fixed, preview fills) → proof strip (three equal cards).
- **Home, phone:** nav (60px) → hero → generator as three steps, one at a time, with the preview on top and the step buttons pinned to the bottom → proof cards stacked.
- **Sign in (`/sign-in`):** one 440px column, 112px below the nav on desktop (28px on phones). The nav shows only the wordmark and "Make a free code".
- **Your codes (`/app`), desktop:** title row (title + count line, "New code" on the right) → one panel holding the list. **Phone:** title, full-width "New code", then the list as stacked rows.
- **Code detail (`/app/codes/[id]`), desktop:** back link, title, short link + Copy, "Dynamic · made …" on the right → left column 444px (sticker and downloads, Points to, Delete) and right column (stat row, Scans per day, then Top countries and Devices side by side). **Phone:** one column in that order, Delete last.

## 4. Components

### Generator (`components/generator/generator.tsx`)
- **Step heading:** 28px ink circle with the number in display 14px white, then the title in `text-step`.
- **Content chips:** 44px tall on phones, 36px on desktop; selected = `bg-ink text-surface`, else `bg-chip`.
- **Inputs:** 48px phones / 46px desktop, `rounded-xl`, `border-line-strong`, focus `border-ink`, 16px text.
- **Pattern tiles:** 64px; selected = 2px ink border, else 1px `line-strong`. Glyph 18px.
- **Colour swatches:** 44px target (36px desktop), selected = 2px ink ring (transparent when not selected, so it can fade). 1px `swatch-edge` ring on the fill.
- **Logo:** dashed drop zone → once added, thumbnail + Small / Medium / Large chips. Sizes are 18%, 22%, 26% of the code width, all proven to scan in `packages/qr/test/render.test.ts`; that is why there is no free slider.
- **Preview sticker:** `sticker` face, 3px `sticker-edge` border, `rounded-3xl`, hard shadow; 224px on phones, 360px on desktop.
- **Step bar (phone):** three 6px segments: done `ink`, current `accent`, next `line`.

### Buttons (`components/ui/buttons.ts`)
Class strings shared by every screen; 52px tall on phones, 44px from `md`, 2px ink border.
- **Primary:** `bg-accent`, `text-on-accent`, `shadow-hard-sm`. Pressed: moves 4px into its shadow (`translate-1` + `shadow-hard-pressed`). Disabled: 40% opacity, no shadow, no press (also the "saved" look of Points to's Save).
- **Secondary:** `surface`. Pressed: `bg-chip`.
- **Danger:** `bg-danger`, `text-on-danger`, no shadow. Pressed: 80% opacity. Only inside a confirm dialog ("Delete code").
- **Text button:** no border, `text-ink-soft`, 44px tall ("Cancel" next to Save). Pressed: `text-ink`.
- **Destructive link:** "Delete this code": `text-danger` with `Trash`, 44px tall, opens the confirm dialog.
- **Step 3 downloads:** SVG, PDF (secondary), then Download PNG (primary). PDF is a vector file, 10 cm square including the quiet zone; SVG and WebP logos are converted to PNG in the browser first because PDF can't embed them. In the phone bar the primary reads "PNG" so back + three formats fit at 360px; its accessible name stays "Download PNG".
- **Detail downloads:** three secondary buttons in a row with `DownloadSimple`: PNG, SVG, PDF; caption "PNG for WhatsApp and the web. SVG or PDF for print shops."

### Dynamic toggle (generator, Link only)
Shown only for the Link content type, in an `accent-tint` row: switch (`role="switch"`, track `accent` on / `line-strong` off, `on-accent` knob, ink focus ring) + "Dynamic" + "Change where it points any time and see who scans." No Dev badge.
- **Signed out, turned on:** a callout below a hairline (`accent-soft`) in the same row: "Dynamic codes need a free account. You can change where the code points after printing and see how many people scan it. Your code still downloads as a regular one without it." + "Sign in with your email →" (ink, underlined). The static code stays fully usable. The draft (content, style, logo) is kept in `localStorage` for an hour so it survives the sign-in round trip, which opens in a new tab from the email.
- **Signed in, on:** the code encodes the short link. It is made on the first download (never on a toggle or keystroke) and reused after; style changes are saved to it after a 600ms pause. Step 3 adds one line: before the first download "Dynamic: your short link is made when you first download." (or "Making your short link…"); after, "Short link **q.ashiangmor.com/abc123**" + "Edit and see scans →".

### Account menu (`components/site-nav.tsx`)
- **Desktop:** a pill button (32px `chip` circle with the email's initial, the email, `CaretDown`); `bg-chip` while open. Dropdown: 280px `surface` panel, `rounded-2xl`, 1px `line` border, no shadow, right-aligned 8px under the button: "Signed in as" (`text-xs muted`) + email (medium), hairline, Sign out (`SignOut`, form POST to `/auth/sign-out`). Closes on Escape or a press outside (`useDismiss`).
- **Phone:** the hamburger opens a sheet under the nav: links as 48px rows (current page `bg-chip`, medium), hairline, then the same "Signed in as" + Sign out (or "Sign in" when signed out). The page behind gets the `scrim`; tapping it closes the sheet.
- **Nav links:** Create, Your codes (signed in). Signed out: "Sign in" + "Get a magic link" (ink button), both to `/sign-in`. Current page: `text-ink font-medium`, `aria-current="page"`.

### Dialog and bottom sheet (`components/ui/dialog.tsx`)
Native `<dialog>` opened with `showModal()` (focus trap, Escape, top layer). Desktop: centred, 440px wide, `surface`, `rounded-2xl`, 1px `line` border, 24px padding. Phone: a bottom sheet, full width, top corners rounded, 32px bottom padding. Backdrop: `scrim`; clicking it closes. Delete confirm: title "Delete this code?" (display, `text-step`), body says what stops working and that it can't be undone; buttons Keep it (secondary) + Delete code (danger), right-aligned on desktop, stacked full width on phones with Delete first.

### Toast (`components/ui/toast.tsx`)
Bottom-centre, 24px up: `bg-ink text-surface` pill (`rounded-xl`), `CheckCircle` + one sentence, `role="status"`, gone after 4 seconds. Used after delete: "Code deleted. Its short link has stopped working." The query parameter that asked for it is removed so a reload doesn't repeat it.

### Saved and copied states
- **Saved (Points to):** `CheckCircle` + "Saved. Scans now open the new link." under the input; Save goes to its disabled look.
- **Editing:** Save enabled, "Cancel" text button, and "Was kofi-chops.com/menu" (`text-xs`) under them.
- **Copied:** the Copy chip (`bg-chip`, `rounded-full`) swaps `Copy` → `Check` and "Copy" → "Copied" for 2 seconds; a screen-reader status says "Short link copied".

### Sign-in states (`/sign-in`)
| State | What shows |
|---|---|
| Default | "Sign in." + "We'll email you a link. No password to remember." Card: Email input + "Email me a sign-in link" (primary). Under it, what an account gives (change codes after printing, see scans, keep codes in one place) and that regular codes stay free without one |
| Check your email | "Check your email." + "We sent a sign-in link to **email**. It works for 15 minutes." Card: `EnvelopeSimple` + where to open it, hairline, "Didn't get it?…" + "Send it again" (secondary). Below: "Wrong email? **Use a different one**" |
| Link expired or used | Card starts with `WarningCircle` + "That sign-in link has expired or was already used." (danger, medium) + "Each link works once, within 15 minutes. Send yourself a new one below.", hairline, email prefilled, "Email me a new link" |
| Rate-limited, bad email, send failure | The server's plain message under the input in `danger` with `WarningCircle`, e.g. "We've sent a few links already. Check your inbox, or try again in 15 minutes." |

### List rows (Your codes)
- **Desktop:** column header (`text-xs ink-soft`): Code · Points to (344px) · Scans, last 7 days (224px) · Last scanned (160px) · chevron. Row: 48px thumbnail (a real render of the code in its saved style on a `sticker` face, `rounded-lg`, 1px `line-strong`), name (medium) over the short link (`text-sm ink-soft`), destination, count (display 18px) + sparkline, last scanned ("2 min ago", "Yesterday", "Not yet"), `CaretRight`. Rows are whole-row links divided by `line`; pressed `bg-surface-sunken`.
- **Phone:** thumbnail, name, short link, "→ destination" (`text-xs`); count, sparkline and last scanned stacked on the right.
- **Count line:** "6 dynamic codes · 903 scans in the last 7 days".
- **Empty state:** one panel: ghost code (`ghost`, dots) on `surface-sunken` on the left (on top on phones), then "No dynamic codes yet.", one line on what a dynamic code is, three numbered steps (same 28px ink circles as the generator) and "New code" (primary, `Plus`). "New code" opens `/?dynamic=on#create`.

### Charts
One rule everywhere: **only the busiest day is `accent`; every other bar is `accent-soft`.** Cobalt means "the peak", nothing else.
- **Sparkline (`components/ui/sparkline.tsx`):** 7 daily bars, 60 × 24px, 4px gaps, oldest first. Peak bar `accent` (latest one on a tie), the rest `accent-soft`, minimum 8% height. No scans: seven 1px `line-dashed` dashes. Decorative (`aria-hidden`); the number beside it carries the meaning.
- **Scans per day (`components/codes/scan-analytics.tsx`):** 30 UTC days, 144px tall (176px desktop), 1px `line` baseline. The busiest bar is `accent` and carries its count above it; **today carries its count too but stays `accent-soft`**. Axis: first date, middle date, "Today". A sentence above says it in words ("Busiest day: Sat 24 Oct, 88 scans. Today so far: 38.") and is also the chart's `aria-label`.
- **Stat row:** Total scans (all time), Last 7 days, Today so far, in `font-display`; three cells divided by `line` on desktop, Total on top on phones.
- **Meters (Top countries, Devices):** label (with device icon) left, "2,604 · 89%" right in `ink-soft`, then a 6px `accent-soft` bar as wide as the share. Top 5 countries; unknown country reads "Somewhere else". Devices adds "9 in 10 scans come from phones."

### States
| State | What shows |
|---|---|
| Empty | Ghost code in `ghost` + "Paste a link to see your code." (wording per content type) |
| Too long | Danger icon + "That's too much to fit in one QR code. Make it shorter." Downloads disabled |
| Logo file too big | "That logo file is too big. Use one under 2 MB." |
| Colour too light | Custom colour under 3:1 contrast with white (`MIN_SCAN_CONTRAST`): `warning-tint` callout under the swatches + warning-coloured status, "This colour is too light for some phones to read. Pick a darker one." Downloads stay enabled |

### Dev badge (`components/dev-mode-badge.tsx`)
Dashed `warning` border, `text-badge`, uppercase "DEV". On every surface of an unreleased
feature, shown only when `NEXT_PUBLIC_DEV_MODE=true`. Since v1.2 that is only **Pricing**
(desktop nav and phone menu) and the **MoMo** chip. Dynamic codes, sign-in, Your codes and the
analytics and edit-after-printing proof cards are shipped and carry no badge.

## 5. Motion

A tool, so motion only answers the user: it confirms a choice, shows where a step went,
or marks something new. Nothing loops, nothing bounces, nothing moves on a keystroke.
CSS only (Tailwind utilities from `@theme` tokens); no animation library.

### Tokens (`globals.css`)

| Token | Value | Utility | Use |
|---|---|---|---|
| `--ease-out-quart` | `cubic-bezier(0.165, 0.84, 0.44, 1)` | `ease-out-quart` | Default for responses and small entrances |
| `--ease-out-quint` | `cubic-bezier(0.23, 1, 0.32, 1)` | `ease-out-quint` | The long hero entrance |
| `--transition-duration-fast` | 120ms | `duration-fast` | Colour changes, button press |
| `--transition-duration-base` | 180ms | `duration-base` | Callouts, phone steps, step bar |
| `--transition-duration-slow` | 240ms | `duration-slow` | The QR sticker settle |
| `--transition-duration-entrance` | 500ms | `duration-entrance` | Hero stickers, once on load |
| `--animate-fade-in` | opacity, base · quart | `animate-fade-in` | The scrim behind the phone menu |
| `dialog-motion` | `@utility` | `dialog-motion` | Native `<dialog>` enter and exit (see below) |
| `enter-delay-*` | n × 80ms | `enter-delay-1`, `-2` | Stagger for the hero stickers |

Durations sit in Tailwind's `--transition-duration-*` namespace so `duration-fast` is a
real utility. Keyframe animations are `--animate-*` tokens (`animate-settle`,
`animate-step-in`, `animate-callout-in`, `animate-fade-in`), except `animate-sticker-in`,
which is an `@utility` because its delay is read from the element.

`dialog-motion` animates a native `<dialog>` both ways without JavaScript: `@starting-style`
gives the enter its first frame, and `overlay`/`display` with `allow-discrete` keep the dialog in
the top layer while it exits. Exits are faster than enters (people want it gone). Its
transitions sit inside `prefers-reduced-motion: no-preference`, so reduced motion gets none.

### Inventory

| Element | What moves | Duration · easing | Reduced motion |
|---|---|---|---|
| Content chips, logo-size chips | background and text colour | fast · quart | same (colour only) |
| Pattern tiles | border colour | fast · quart | same |
| Colour swatches | selection ring fades in | fast · quart | same |
| QR preview sticker | on pattern, colour or logo change (not on typing) and when the code first appears: starts 3px pressed into a `shadow-hard-sm`, settles to rest | slow · quart | none |
| Phone steps | the new step fades in and rises 6px | base · quart | none |
| Phone step bar | segment colour | base · quart | same |
| Primary button | press: moves 4px into its shadow, shadow goes to zero | fast · quart | none (no move, shadow stays) |
| Secondary button | press: `bg-chip` | fast · quart | same |
| Hero stickers | fade in and rise 16px, 80ms apart | entrance · quint | none (shown at rest) |
| Warning callout, too-long alert, logo error | fade in, drop 4px | base · quart | none |
| Dynamic toggle | track colour | fast · quart | same |
| Signed-out Dynamic callout | fade in, drop 4px (`callout-in`) | base · quart | none |
| Dialog (desktop) | enter: fade in + scale 0.95 → 1; exit: reverse; backdrop fades | enter base, exit fast · quart | none (appears, disappears) |
| Bottom sheet (phone) | enter: slides up from below the screen; exit: slides down; backdrop fades | enter slow, exit fast · quart | none |
| Account dropdown, phone menu sheet | fade in, drop 4px (`callout-in`); closes instantly | base · quart | none |
| Phone menu scrim | fade in (`fade-in`) | base · quart | none |
| Toast | fade in, rise 6px (`step-in`) | base · quart | none |
| Saved / copied / error lines, short-link line | fade in, drop 4px (`callout-in`) | base · quart | none |
| Sign-in "Check your email" | fade in, rise 6px (`step-in`) | base · quart | none |
| Copy chip, list row press | colour | fast · quart | same |

**Reduced motion:** every keyframe animation and the press translate are written behind
`motion-safe:`, so `prefers-reduced-motion: reduce` gets no movement at all. Colour
fades stay because they don't move anything.

**Adding motion:** use the tokens above, `motion-safe:` on anything that moves, and
animate `transform`/`opacity` (the sticker settle also animates its shadow, one element).

## 6. Implementation notes

- No hex literals or arbitrary values (`text-[13px]`) in components; add a token here and in `globals.css` first, with a dark value. Data-driven inline styles (swatch colours, chart heights) are the exception.
- Touch targets 44px minimum on phones; inputs 16px on phones.
- Generated QR SVGs render through `<QrArt>`; they come from our renderer, never from user markup.
- Error copy follows the plain-language rule: what happened, then what to do. Route handlers answer `{ message, details? }` in plain copy; the client shows both (`getApiErrorText`). No connection: "We couldn't reach QR Daddy. Check your internet connection and try again." Anything else that breaks: "Something went wrong on our side. Try again in a minute."
- Data-driven inline styles are allowed for chart bar heights and meter widths, like swatch colours.

## Changelog

- **v1.2 · 2026-10-29** Account surfaces from the "QR Daddy — Account" canvas: sign-in states, Your codes (list rows, empty state, sparkline), code detail (stat row, scans-per-day chart, meters, Points to with saved state, copy chip, downloads), delete dialog / bottom sheet, toast, account menu (desktop dropdown, phone sheet with scrim). New tokens `on-danger`, `scrim`, `animate-fade-in` and the `dialog-motion` utility; shared button styles (primary, secondary, danger, text). Chart rule: only the busiest day is cobalt. The Dynamic toggle is real (Link only, no Dev badge); Dev badge left on Pricing and MoMo. Product rule written down: static codes never need an account.

- **v1.1 · 2026-10-29** Dark mode (system setting) for every token, sticker and `on-accent` tokens, `ghost` replaces the placeholder hex; motion tokens and the first motion pass. PDF download, a secondary button next to SVG on desktop and in the phone step bar; phone bar primary label shortened to "PNG".
- **v1.0 · 2026-10-28** First version, from the merge of direction A (Workbench) and B (Loud) without B's yellow.
- **v1.3 · 2026-10-29** Content frame: page sections are capped at `max-w-page` (1280px incl. gutters) and centred, so content no longer runs to the screen edges on wide displays.
