"use client";

import type { Code } from "@qr-daddy/core";
import { useEffect, useState } from "react";
import { apiRequest, getApiErrorText } from "@/lib/api-client";
import type { QrStyle } from "@/lib/qr-style";

/** The dynamic code this tab made, kept for the tab's session so later downloads reuse it. */
export interface DynamicCode {
	id: string;
	shortUrl: string;
	destination: string;
	style: QrStyle;
}

const KEY = "qd:dynamic-code";
const STYLE_SAVE_DELAY_MS = 600;

function remember(code: DynamicCode | null) {
	try {
		if (code) sessionStorage.setItem(KEY, JSON.stringify(code));
		else sessionStorage.removeItem(KEY);
	} catch {
		// Without storage the code is still made; a reload just won't reuse it.
	}
}

/** "kofi-chops.com/menu" from "https://kofi-chops.com/menu/": the name a new code gets in Your codes. */
export function titleFor(destination: string): string {
	const url = URL.parse(destination);
	const title = url ? `${url.host}${url.pathname}`.replace(/\/$/, "") : destination;
	return title.slice(0, 120);
}

/**
 * Makes the dynamic code on the first download (never on a toggle or keystroke), then reuses
 * it. A different link makes a new code: the earlier one may already be printed. Style
 * changes are saved after a short pause, only to the code for the link on screen.
 */
export function useDynamicCode(style: QrStyle, active: boolean, destination: string | null) {
	const [code, setCode] = useState<DynamicCode | null>(null);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		try {
			const stored = sessionStorage.getItem(KEY);
			if (stored) setCode(JSON.parse(stored) as DynamicCode);
		} catch {
			// Nothing to reuse.
		}
	}, []);

	const styleKey = JSON.stringify(style);
	useEffect(() => {
		// Only restyle the code this link made; a code for an earlier link may already be printed.
		if (!active || !code || code.destination !== destination || JSON.stringify(code.style) === styleKey) return;
		const timer = setTimeout(async () => {
			const result = await apiRequest<Code>(`/api/codes/${code.id}`, "PATCH", { style });
			if (!result.ok) {
				setError(getApiErrorText(result));
				return;
			}
			const next = { ...code, style };
			setCode(next);
			remember(next);
		}, STYLE_SAVE_DELAY_MS);
		return () => clearTimeout(timer);
		// `style` is captured through styleKey.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active, code, styleKey]);

	/** The code for `destination`, made now if this tab hasn't made it yet. Null after a failure (see `error`). */
	async function ensure(destination: string): Promise<DynamicCode | null> {
		setSaving(true);
		setError(null);
		if (code?.destination === destination) {
			// Confirm the remembered code is still there and still this person's (codes are scoped
			// to their owner, so another account's code answers 404), saving the style on the way.
			const check = await apiRequest<Code>(`/api/codes/${code.id}`, "PATCH", { style });
			if (check.ok) {
				setSaving(false);
				const current = { ...code, style };
				setCode(current);
				remember(current);
				return current;
			}
			if (check.status !== 404) {
				setSaving(false);
				setError(getApiErrorText(check));
				return null;
			}
			// Deleted, or made under another account: forget it and make a new one.
			setCode(null);
			remember(null);
		}
		const result = await apiRequest<Code>("/api/codes", "POST", { destination, title: titleFor(destination), style });
		setSaving(false);
		if (!result.ok) {
			setError(getApiErrorText(result));
			return null;
		}
		const made = { id: result.data.id, shortUrl: result.data.shortUrl, destination: result.data.destination, style };
		setCode(made);
		remember(made);
		return made;
	}

	return { code, saving, error, ensure };
}
