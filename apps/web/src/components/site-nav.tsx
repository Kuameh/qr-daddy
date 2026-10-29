"use client";

import { CaretDown, List, SignOut, X } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";
import { DevModeBadge } from "@/components/dev-mode-badge";
import { useDismiss } from "@/components/ui/use-dismiss";
import { DEV_MODE } from "@/lib/dev-mode";

type Page = "create" | "codes" | "sign-in";

const linkClass = (active: boolean) => (active ? "font-medium text-ink" : "text-ink-soft");

function SignOutButton() {
	return (
		<form action="/auth/sign-out" method="post">
			<button type="submit" className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-base text-ink-soft transition-colors duration-fast ease-out-quart active:bg-chip md:h-10 md:text-sm">
				<SignOut size={20} /> Sign out
			</button>
		</form>
	);
}

function SignedInAs({ email }: { email: string }) {
	return (
		<div className="flex flex-col gap-0.5 px-3 py-2">
			<span className="text-xs text-muted">Signed in as</span>
			<span className="truncate text-base font-medium md:text-sm">{email}</span>
		</div>
	);
}

/** Desktop account button and its dropdown. */
function AccountMenu({ email }: { email: string }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const close = useCallback(() => setOpen(false), []);
	useDismiss(open, close, ref);

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				aria-expanded={open}
				aria-haspopup="menu"
				onClick={() => setOpen(!open)}
				className={`flex h-10 items-center gap-2.5 rounded-full pr-3 pl-1 text-sm text-ink-soft transition-colors duration-fast ease-out-quart ${open ? "bg-chip" : ""}`}
			>
				<span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-chip font-medium text-ink uppercase">{email[0]}</span>
				<span className="max-w-60 truncate">{email}</span>
				<CaretDown size={16} />
			</button>
			{open && (
				<div className="absolute top-full right-0 z-20 mt-2 flex w-70 flex-col gap-1 rounded-2xl border border-line bg-surface p-2 motion-safe:animate-callout-in">
					<SignedInAs email={email} />
					<div className="mx-1 h-px bg-line" />
					<SignOutButton />
				</div>
			)}
		</div>
	);
}

/**
 * The top bar. `user` is the signed-in user (null when signed out); `page` marks the current link.
 * On the sign-in page it only offers the way back to the free generator.
 */
export function SiteNav({ user, page }: { user: { email: string } | null; page: Page }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLElement>(null);
	const close = useCallback(() => setOpen(false), []);
	useDismiss(open, close, ref);

	const links = [
		{ href: "/", label: "Create", active: page === "create" },
		...(user ? [{ href: "/app", label: "Your codes", active: page === "codes" }] : []),
	];

	return (
		<header ref={ref} className="relative z-30 border-b border-line bg-surface">
			<div className="mx-auto flex h-15 w-full max-w-page items-center justify-between px-4 md:h-18 md:px-10">
				<a href="/" className="flex h-11 items-center font-display text-2xl tracking-tight">qr daddy.</a>

				{page !== "sign-in" && (
					<nav className="hidden items-center gap-8 text-sm md:flex">
						{links.map((link) => (
							<a key={link.href} href={link.href} aria-current={link.active ? "page" : undefined} className={linkClass(link.active)}>{link.label}</a>
						))}
						{DEV_MODE && <a href="#" className="flex items-center gap-1.5 text-ink-soft">Pricing <DevModeBadge /></a>}
					</nav>
				)}

				<div className="hidden items-center gap-4 md:flex">
					{page === "sign-in" ? (
						<a href="/" className="text-sm text-ink-soft">Make a free code</a>
					) : user ? (
						<AccountMenu email={user.email} />
					) : (
						<>
							<a href="/sign-in" className="text-sm text-ink-soft">Sign in</a>
							<a href="/sign-in" className="flex items-center rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-surface">Get a magic link</a>
						</>
					)}
				</div>

				<button
					type="button"
					onClick={() => setOpen(!open)}
					aria-expanded={open}
					aria-label={open ? "Close menu" : "Open menu"}
					className="flex size-11 items-center justify-center md:hidden"
				>
					{open ? <X size={24} /> : <List size={24} />}
				</button>
			</div>

			{open && (
				<>
					<div aria-hidden onClick={close} className="fixed inset-x-0 top-15 bottom-0 bg-scrim motion-safe:animate-fade-in md:hidden" />
					<nav className="absolute inset-x-0 top-full flex flex-col gap-1 border-y border-line bg-surface px-4 py-3 motion-safe:animate-callout-in md:hidden">
						{links.map((link) => (
							<a key={link.href} href={link.href} aria-current={link.active ? "page" : undefined}
								className={`flex h-12 items-center rounded-xl px-3 text-base ${link.active ? "bg-chip font-medium text-ink" : "text-ink-soft"}`}>{link.label}</a>
						))}
						{DEV_MODE && <a href="#" className="flex h-12 items-center gap-2 px-3 text-base text-ink-soft">Pricing <DevModeBadge /></a>}
						<div className="my-2 h-px bg-line" />
						{user ? (
							<>
								<SignedInAs email={user.email} />
								<SignOutButton />
							</>
						) : (
							<a href="/sign-in" className="flex h-12 items-center px-3 text-base text-ink-soft">Sign in</a>
						)}
					</nav>
				</>
			)}
		</header>
	);
}
