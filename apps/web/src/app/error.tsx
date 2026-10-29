"use client";

import { WarningCircle } from "@phosphor-icons/react";

// Anything a page throws (the data store being down, mostly) lands here instead of a stack trace.
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
	return (
		<main className="mx-auto flex max-w-110 flex-col items-start gap-4 px-4 pt-16">
			<p role="alert" className="flex items-start gap-2 text-base">
				<WarningCircle size={20} className="mt-0.5 shrink-0 text-danger" />
				Something went wrong on our side. Try again in a minute.
			</p>
			<button type="button" onClick={retry} className="flex h-11 items-center rounded-xl border-2 border-ink bg-surface px-4 text-sm font-medium">
				Try again
			</button>
		</main>
	);
}
