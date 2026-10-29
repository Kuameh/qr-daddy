import type { LogoSize, Pattern } from "@qr-daddy/qr";
import type { ContentType, Fields } from "./content";

// What the generator holds while a signed-out user goes to sign in for a dynamic code.
// localStorage rather than sessionStorage: the sign-in link opens from the email app in a
// new tab, which starts a new session. The draft is dropped once read, and after an hour.

export interface Draft {
	type: ContentType;
	fields: Fields;
	pattern: Pattern;
	colour: string;
	logo: { href: string; size: LogoSize } | null;
}

const KEY = "qd:draft";
const MAX_AGE_MS = 60 * 60 * 1000;

export function saveDraft(draft: Draft) {
	try {
		localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), draft }));
	} catch {
		// A big logo can go over the storage quota: keep the rest.
		try {
			localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), draft: { ...draft, logo: null } }));
		} catch {
			// Storage blocked (private mode): the user starts again after signing in.
		}
	}
}

/** The saved draft, removed as it is read. Null when there is none, or it is over an hour old. */
export function takeDraft(): Draft | null {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;
		localStorage.removeItem(KEY);
		const { savedAt, draft } = JSON.parse(raw) as { savedAt: number; draft: Draft };
		return Date.now() - savedAt < MAX_AGE_MS ? draft : null;
	} catch {
		return null;
	}
}
