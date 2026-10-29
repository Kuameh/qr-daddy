"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";

const SHOW_MS = 4000;

/**
 * A short confirmation pinned to the bottom of the screen, gone after 4 seconds.
 * `clearParam` names the query parameter that asked for it; it is removed from the address
 * so a reload doesn't show the toast again.
 */
export function Toast({ children, clearParam }: { children: ReactNode; clearParam?: string }) {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		if (clearParam) {
			const url = new URL(window.location.href);
			url.searchParams.delete(clearParam);
			window.history.replaceState(null, "", url);
		}
		const timer = setTimeout(() => setVisible(false), SHOW_MS);
		return () => clearTimeout(timer);
	}, [clearParam]);

	if (!visible) return null;
	return (
		<div role="status" className="fixed inset-x-4 bottom-6 z-40 flex justify-center">
			<p className="flex items-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm text-surface motion-safe:animate-step-in">
				<CheckCircle size={18} className="shrink-0" />
				{children}
			</p>
		</div>
	);
}
