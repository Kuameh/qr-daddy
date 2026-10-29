"use client";

import { useEffect, type RefObject } from "react";

/** Closes a menu on Escape or on a press outside `ref`. */
export function useDismiss(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
		const onPointer = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && close();
		document.addEventListener("keydown", onKey);
		document.addEventListener("pointerdown", onPointer);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("pointerdown", onPointer);
		};
	}, [open, close, ref]);
}
