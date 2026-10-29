"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal dialog on desktop, bottom sheet on phones (native <dialog>: focus trap, Esc, top layer).
 * Clicking the dimmed page closes it. Motion lives in the `dialog-motion` utility in globals.css.
 */
export function Dialog({ open, onClose, labelledBy, children }: {
	open: boolean;
	onClose: () => void;
	labelledBy: string;
	children: ReactNode;
}) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current!;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			aria-labelledby={labelledBy}
			onClose={onClose}
			onClick={(e) => e.target === e.currentTarget && onClose()}
			className="dialog-motion m-auto w-full max-w-110 rounded-2xl border border-line bg-surface p-0 text-ink max-md:mx-0 max-md:mb-0 max-md:max-w-none max-md:rounded-b-none"
		>
			<div className="flex flex-col gap-4 px-4 pt-6 pb-8 md:p-6">{children}</div>
		</dialog>
	);
}
