"use client";

import type { Code, CodeKind } from "@qr-daddy/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getApiErrorText } from "@/lib/api-client";
import { logoToSave } from "@/lib/logo";
import type { QrStyle } from "@/lib/qr-style";
import type { ContentType } from "./content";

/** What a download saves for a signed-in person: a dynamic code (Link + Dynamic on) or a static one. */
export interface SaveTarget {
	kind: CodeKind;
	contentType: ContentType;
	/** The link a dynamic code points to, or the exact text a static code encodes. */
	destination: string;
	title: string;
}

/** A code this tab saved, kept for the tab's session so later downloads of the same thing reuse it. */
export interface SavedCode {
	id: string;
	kind: CodeKind;
	/** Null for static codes. */
	shortUrl: string | null;
	style: QrStyle;
	/**
	 * Stands in for the logo last saved (see logoKey); null when it has none. Missing on codes
	 * remembered before logos were saved: their logo is unknown, so only a download sends one.
	 */
	logoKey?: string | null;
}

const KEY = "qd:saved-codes";
const STYLE_SAVE_DELAY_MS = 600;

const keyFor = (target: SaveTarget) => `${target.kind}:${target.contentType}:${target.destination}`;

/**
 * A short fingerprint of a logo (length + 32-bit FNV-1a), so remembered codes can tell whether the
 * logo changed without keeping the image itself in sessionStorage.
 */
function logoKey(logo: string | null): string | null {
	if (!logo) return null;
	let hash = 0x811c9dc5;
	for (let i = 0; i < logo.length; i++) hash = Math.imul(hash ^ logo.charCodeAt(i), 0x01000193);
	return `${logo.length}:${(hash >>> 0).toString(36)}`;
}

function remember(codes: Record<string, SavedCode>) {
	try {
		sessionStorage.setItem(KEY, JSON.stringify(codes));
	} catch {
		// Without storage the code is still saved; a reload just won't reuse it.
	}
}

/**
 * Saves the code on screen to Your codes on its first download (never on a toggle or keystroke),
 * then reuses it. `target` is null when signed out or when there's nothing to save.
 *
 * Remembered codes are keyed by kind and content: a different link makes a new dynamic code (the
 * earlier one may already be printed), and the same static content finds its saved code again
 * (the server upserts it too). Style and logo changes are saved after a short pause, only to the
 * code matching what's on screen. `logo` is the logo as picked (the one the preview and files use),
 * or null; what's saved is a smaller copy of it (see logoToSave).
 */
export function useSavedCode(style: QrStyle, logo: string | null, target: SaveTarget | null) {
	const codes = useRef<Record<string, SavedCode>>({});
	const [, rerender] = useState(0);
	const [saving, setSaving] = useState<string | null>(null);
	const [error, setError] = useState<{ key: string; message: string } | null>(null);
	// The code (by key) last saved without its logo because the logo couldn't be made small enough.
	const [logoLeftOut, setLogoLeftOut] = useState<string | null>(null);

	function put(key: string, code: SavedCode | null) {
		const next = { ...codes.current };
		if (code) next[key] = code;
		else delete next[key];
		codes.current = next;
		remember(next);
		rerender((n) => n + 1);
	}

	useEffect(() => {
		try {
			const stored = sessionStorage.getItem(KEY);
			if (stored) {
				codes.current = JSON.parse(stored) as Record<string, SavedCode>;
				rerender((n) => n + 1);
			}
		} catch {
			// Nothing to reuse.
		}
	}, []);

	const key = target ? keyFor(target) : null;
	const code = key ? (codes.current[key] ?? null) : null;

	/** The logo copy to send for `forKey`'s code, noting when it has to be left out. */
	async function logoCopy(forKey: string): Promise<string | null> {
		const copy = logo ? await logoToSave(logo) : null;
		setLogoLeftOut(logo && !copy ? forKey : (current) => (current === forKey ? null : current));
		return copy;
	}

	const styleKey = JSON.stringify(style);
	const currentLogoKey = useMemo(() => logoKey(logo), [logo]);
	useEffect(() => {
		// Only restyle the code for what's on screen; a code for something else may already be printed.
		// Static codes only take a new style or logo when it is downloaded (ensure() saves it then):
		// trying a colour and leaving shouldn't change the saved copy.
		if (!key || !code || code.kind !== "dynamic") return;
		const styleChanged = JSON.stringify(code.style) !== styleKey;
		// The logo is only sent when it changed; an unknown one (see SavedCode.logoKey) never is.
		const logoChanged = code.logoKey !== undefined && code.logoKey !== currentLogoKey;
		if (!styleChanged && !logoChanged) return;
		let live = true;
		const timer = setTimeout(async () => {
			const body: { style: QrStyle; logo?: string | null } = { style };
			if (logoChanged) {
				body.logo = await logoCopy(key);
				// Picked again or removed while it was being shrunk: the newer run sends that instead.
				if (!live) return;
			}
			const result = await apiRequest<Code>(`/api/codes/${code.id}`, "PATCH", body);
			if (!result.ok) {
				setError({ key, message: getApiErrorText(result) });
				return;
			}
			put(key, { ...code, style, logoKey: logoChanged ? currentLogoKey : code.logoKey });
		}, STYLE_SAVE_DELAY_MS);
		return () => {
			live = false;
			clearTimeout(timer);
		};
		// `style` and `logo` are captured through styleKey and currentLogoKey.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, code, styleKey, currentLogoKey]);

	/** The saved code for what's on screen, saved now if this tab hasn't yet. Null after a failure (see `error`). */
	async function ensure(): Promise<SavedCode | null> {
		if (!target || !key) return null;
		setSaving(key);
		setError(null);
		// A save for something else may finish while this one runs; only clear our own flag.
		const done = () => setSaving((current) => (current === key ? null : current));
		const fail = (message: string) => {
			done();
			setError({ key, message });
			return null;
		};
		const savedLogo = await logoCopy(key);
		const known = codes.current[key];
		if (known) {
			// Confirm the remembered code is still there and still this person's (codes are scoped
			// to their owner, so another account's code answers 404), saving the style and logo on the way.
			const check = await apiRequest<Code>(`/api/codes/${known.id}`, "PATCH", { style, logo: savedLogo });
			if (check.ok) {
				const current = { ...known, style, logoKey: currentLogoKey };
				put(key, current);
				done();
				return current;
			}
			if (check.status !== 404) return fail(getApiErrorText(check));
			// Deleted, or made under another account: forget it and save it again.
			put(key, null);
		}
		const result = await apiRequest<Code>("/api/codes", "POST", { ...target, style, logo: savedLogo });
		if (!result.ok) return fail(getApiErrorText(result));
		const made = { id: result.data.id, kind: result.data.kind, shortUrl: result.data.shortUrl, style, logoKey: currentLogoKey };
		put(key, made);
		done();
		return made;
	}

	return {
		code,
		saving: key !== null && saving === key,
		error: key !== null && error?.key === key ? error.message : null,
		/** The code on screen was saved without its logo, which couldn't be made small enough to keep. */
		logoLeftOut: key !== null && logoLeftOut === key,
		ensure,
	};
}
