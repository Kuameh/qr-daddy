"use client";

import { EnvelopeSimple, WarningCircle } from "@phosphor-icons/react";
import type { MagicLinkFailure } from "@qr-daddy/core";
import { useEffect, useState, type FormEvent } from "react";
import { inputClass } from "@/components/generator/fields";
import { primaryButton, secondaryButton } from "@/components/ui/buttons";
import { apiRequest, getApiErrorText } from "@/lib/api-client";

// The last address used here, so "Email me a new link" after an expired link is one tap.
const LAST_EMAIL_KEY = "qd:last-email";

const LINK_COPY: Record<MagicLinkFailure, { title: string; body: string }> = {
	expired: {
		title: "That sign-in link has expired or was already used.",
		body: "Each link works once, within 15 minutes. Send yourself a new one below.",
	},
	used: {
		title: "That sign-in link has expired or was already used.",
		body: "Each link works once, within 15 minutes. Send yourself a new one below.",
	},
	unknown: {
		title: "That sign-in link doesn't work.",
		body: "It may not have copied in full. Send yourself a new one below.",
	},
};

const card = "flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 md:p-6";

function ErrorLine({ children }: { children: string }) {
	return (
		<p role="alert" className="flex items-start gap-2 text-sm text-danger motion-safe:animate-callout-in">
			<WarningCircle size={18} className="mt-px shrink-0" />
			{children}
		</p>
	);
}

export function SignInForm({ next, linkFailure }: { next: string; linkFailure: MagicLinkFailure | null }) {
	const [email, setEmail] = useState("");
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [resent, setResent] = useState(false);

	useEffect(() => {
		try {
			setEmail((current) => current || localStorage.getItem(LAST_EMAIL_KEY) || "");
		} catch {
			// Storage blocked (private mode): the field just starts empty.
		}
	}, []);

	async function send(address: string) {
		setSending(true);
		setError(null);
		const result = await apiRequest<{ email: string }>("/api/auth/link", "POST", { email: address, next });
		setSending(false);
		if (!result.ok) {
			setError(getApiErrorText(result));
			return false;
		}
		try {
			localStorage.setItem(LAST_EMAIL_KEY, result.data.email);
		} catch {
			// Only a convenience.
		}
		setSentTo(result.data.email);
		return true;
	}

	async function submit(e: FormEvent) {
		e.preventDefault();
		await send(email);
	}

	if (sentTo) {
		return (
			<div className="flex flex-col gap-6 motion-safe:animate-step-in">
				<div className="flex flex-col gap-3 md:gap-5">
					<h1 className="font-display text-display-lg">Check your email.</h1>
					<p className="text-base text-ink-soft md:text-lg">
						We sent a sign-in link to <strong className="font-medium text-ink">{sentTo}</strong>. It works for 15 minutes.
					</p>
				</div>
				<div className={card}>
					<p className="flex items-start gap-3 text-base">
						<EnvelopeSimple size={24} className="shrink-0" />
						Open the link on the phone or computer you want to sign in on.
					</p>
					<div className="h-px bg-line" />
					<p className="text-sm text-ink-soft">Didn't get it? Check your spam folder, or send it again.</p>
					<div className="flex flex-col gap-3 md:flex-row md:items-center">
						<button type="button" disabled={sending} className={secondaryButton}
							onClick={async () => setResent(await send(sentTo))}>Send it again</button>
						{resent && !error && <p role="status" className="text-sm text-ink-soft motion-safe:animate-callout-in">Sent. The newest link is the one to use.</p>}
					</div>
					{error && <ErrorLine>{error}</ErrorLine>}
				</div>
				<p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
					Wrong email?
					<button type="button" className="flex h-11 items-center font-medium text-ink"
						onClick={() => { setSentTo(null); setResent(false); setError(null); }}>Use a different one</button>
				</p>
			</div>
		);
	}

	const failure = linkFailure ? LINK_COPY[linkFailure] : null;
	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-3 md:gap-5">
				<h1 className="font-display text-display-lg">Sign in.</h1>
				{!failure && <p className="text-base text-ink-soft md:text-lg">We'll email you a link. No password to remember.</p>}
			</div>
			<form onSubmit={submit} className={card} noValidate>
				{failure && (
					<>
						<div className="flex items-start gap-2.5">
							<WarningCircle size={22} className="shrink-0 text-danger" />
							<div className="flex flex-col gap-1">
								<p className="text-sm font-medium text-danger">{failure.title}</p>
								<p className="text-sm text-ink-soft">{failure.body}</p>
							</div>
						</div>
						<div className="h-px bg-line" />
					</>
				)}
				<label className="flex flex-col gap-1.5">
					<span className="text-sm font-medium">Email</span>
					<input className={inputClass} type="email" inputMode="email" autoComplete="email" placeholder="you@example.com"
						required value={email} onChange={(e) => setEmail(e.target.value)} />
				</label>
				{error && <ErrorLine>{error}</ErrorLine>}
				<button type="submit" disabled={sending} className={primaryButton}>
					{failure ? "Email me a new link" : "Email me a sign-in link"}
				</button>
			</form>
			{!failure && (
				<p className="text-sm leading-normal text-ink-soft">
					New here? The same link makes your free account. With it you can change where a code points after printing,
					see how many people scan it, and keep all your codes in one place. Making and downloading regular codes
					stays free, no account needed.
				</p>
			)}
		</div>
	);
}
