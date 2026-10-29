"use client";

import type { Code, CodeKind } from "@qr-daddy/core";
import { useEffect, useRef, useState } from "react";
import { apiRequest, getApiErrorText } from "@/lib/api-client";
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
}

const KEY = "qd:saved-codes";
const STYLE_SAVE_DELAY_MS = 600;

const keyFor = (target: SaveTarget) => `${target.kind}:${target.contentType}:${target.destination}`;

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
 * (the server upserts it too). Style changes are saved after a short pause, only to the code
 * matching what's on screen.
 */
export function useSavedCode(style: QrStyle, target: SaveTarget | null) {
	const codes = useRef<Record<string, SavedCode>>({});
	const [, rerender] = useState(0);
	const [saving, setSaving] = useState<string | null>(null);
	const [error, setError] = useState<{ key: string; message: string } | null>(null);

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

	const styleKey = JSON.stringify(style);
	useEffect(() => {
		// Only restyle the code for what's on screen; a code for something else may already be printed.
		// Static codes only take a new style when that style is downloaded (ensure() saves it then):
		// trying a colour and leaving shouldn't change the saved copy.
		if (!key || !code || code.kind !== "dynamic" || JSON.stringify(code.style) === styleKey) return;
		const timer = setTimeout(async () => {
			const result = await apiRequest<Code>(`/api/codes/${code.id}`, "PATCH", { style });
			if (!result.ok) {
				setError({ key, message: getApiErrorText(result) });
				return;
			}
			put(key, { ...code, style });
		}, STYLE_SAVE_DELAY_MS);
		return () => clearTimeout(timer);
		// `style` is captured through styleKey.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, code, styleKey]);

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
		const known = codes.current[key];
		if (known) {
			// Confirm the remembered code is still there and still this person's (codes are scoped
			// to their owner, so another account's code answers 404), saving the style on the way.
			const check = await apiRequest<Code>(`/api/codes/${known.id}`, "PATCH", { style });
			if (check.ok) {
				const current = { ...known, style };
				put(key, current);
				done();
				return current;
			}
			if (check.status !== 404) return fail(getApiErrorText(check));
			// Deleted, or made under another account: forget it and save it again.
			put(key, null);
		}
		const result = await apiRequest<Code>("/api/codes", "POST", { ...target, style });
		if (!result.ok) return fail(getApiErrorText(result));
		const made = { id: result.data.id, kind: result.data.kind, shortUrl: result.data.shortUrl, style };
		put(key, made);
		done();
		return made;
	}

	return {
		code,
		saving: key !== null && saving === key,
		error: key !== null && error?.key === key ? error.message : null,
		ensure,
	};
}
