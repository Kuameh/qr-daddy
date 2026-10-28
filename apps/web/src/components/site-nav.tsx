"use client";

import { List, X } from "@phosphor-icons/react";
import { useState } from "react";
import { DevModeBadge } from "@/components/dev-mode-badge";
import { DEV_MODE } from "@/lib/dev-mode";

// Pages that don't exist yet stay behind dev mode. Desktop and mobile show the same list.
const UNRELEASED = ["Dynamic codes", "Analytics", "Pricing"];

export function SiteNav() {
	const [open, setOpen] = useState(false);

	return (
		<header className="border-b border-line bg-surface">
			<div className="flex h-15 items-center justify-between px-4 md:h-18 md:px-10">
				<a href="/" className="flex h-11 items-center font-display text-2xl tracking-tight">qr daddy.</a>

				<nav className="hidden items-center gap-8 text-sm text-ink-soft md:flex">
					<a href="/" className="font-medium text-ink">Create</a>
					{DEV_MODE && UNRELEASED.map((item) => (
						<a key={item} href="#" className="flex items-center gap-1.5">{item} <DevModeBadge /></a>
					))}
				</nav>

				{DEV_MODE && (
					<div className="hidden items-center gap-4 md:flex">
						<a href="#" className="flex items-center gap-1.5 text-sm text-ink-soft">Sign in <DevModeBadge /></a>
						<a href="#" className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-surface">Get a magic link <DevModeBadge /></a>
					</div>
				)}

				{DEV_MODE && (
					<button
						type="button"
						onClick={() => setOpen(!open)}
						aria-expanded={open}
						aria-label={open ? "Close menu" : "Open menu"}
						className="flex size-11 items-center justify-center md:hidden"
					>
						{open ? <X size={24} /> : <List size={24} />}
					</button>
				)}
			</div>

			{DEV_MODE && open && (
				<nav className="flex flex-col border-t border-line px-4 py-2 md:hidden">
					<a href="/" className="flex h-11 items-center font-medium">Create</a>
					{[...UNRELEASED, "Sign in"].map((item) => (
						<a key={item} href="#" className="flex h-11 items-center gap-2 text-ink-soft">{item} <DevModeBadge /></a>
					))}
				</nav>
			)}
		</header>
	);
}
