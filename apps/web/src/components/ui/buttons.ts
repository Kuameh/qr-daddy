// Button looks shared across the app. Heights: 52px on phones, 44px from md.
// docs/DESIGN_SYSTEM.md § Buttons describes each one.

const base =
	"flex h-13 items-center justify-center rounded-xl border-2 border-ink text-base font-medium transition duration-fast ease-out-quart disabled:opacity-40 md:h-11 md:text-sm";

/** The one loud action on a screen: cobalt, hard ink shadow, presses into its shadow. */
export const primaryButton = `${base} bg-accent px-4.5 text-on-accent shadow-hard-sm motion-safe:enabled:active:translate-1 motion-safe:enabled:active:shadow-hard-pressed disabled:shadow-none`;

/** Everything else you can press: surface face, ink border. */
export const secondaryButton = `${base} bg-surface px-4 enabled:active:bg-chip`;

/** Confirms something that can't be undone (delete). Only inside a confirm dialog. */
export const dangerButton = `${base} bg-danger px-4 text-on-danger enabled:active:opacity-80`;

/** A quiet text action next to a button ("Cancel"). */
export const textButton =
	"flex h-11 items-center px-3 text-sm font-medium text-ink-soft transition-colors duration-fast ease-out-quart enabled:active:text-ink";
