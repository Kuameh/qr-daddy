import type { Code, ContentType } from "@qr-daddy/core";
import { MAX_TITLE_LENGTH } from "@qr-daddy/core";
import { payloads } from "@qr-daddy/qr";
import { prettyUrl } from "@/lib/format";

export type { ContentType };

export interface Fields {
	link: { url: string };
	wifi: { ssid: string; password: string; open: boolean };
	contact: { name: string; phone: string; email: string; org: string };
	sms: { phone: string; message: string };
	email: { to: string; subject: string; body: string };
}

export const CONTENT_TYPES: Array<{ type: ContentType; label: string; empty: string }> = [
	{ type: "link", label: "Link", empty: "Paste a link to see your code." },
	{ type: "wifi", label: "Wi-Fi", empty: "Add your Wi-Fi name to see your code." },
	{ type: "contact", label: "Contact", empty: "Add a name to see your code." },
	{ type: "sms", label: "SMS", empty: "Add a phone number to see your code." },
	{ type: "email", label: "Email", empty: "Add an email address to see your code." },
];

export const EMPTY_FIELDS: Fields = {
	link: { url: "" },
	wifi: { ssid: "", password: "", open: false },
	contact: { name: "", phone: "", email: "", org: "" },
	sms: { phone: "", message: "" },
	email: { to: "", subject: "", body: "" },
};

// Phones only open a link when it has a scheme, so "kofi-chops.com" becomes https://kofi-chops.com.
function withScheme(url: string) {
	return /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
}

/** The text the code will carry, or null while the required field is still empty. */
export function contentText(type: ContentType, fields: Fields): string | null {
	switch (type) {
		case "link": {
			const url = fields.link.url.trim();
			return url ? withScheme(url) : null;
		}
		case "wifi": {
			const { ssid, password, open } = fields.wifi;
			return ssid.trim() ? payloads.wifi({ ssid: ssid.trim(), password, security: open ? "nopass" : "WPA" }) : null;
		}
		case "contact": {
			const { name, phone, email, org } = fields.contact;
			return name.trim() ? payloads.contact({ name: name.trim(), phone, email, org }) : null;
		}
		case "sms": {
			const { phone, message } = fields.sms;
			return phone.trim() ? payloads.sms({ phone: phone.trim(), message }) : null;
		}
		case "email": {
			const { to, subject, body } = fields.email;
			return to.trim() ? payloads.email({ to: to.trim(), subject, body }) : null;
		}
	}
}

/** "Wi-Fi" for "wifi": the type label Your codes shows. */
export const contentLabel = (type: ContentType) => CONTENT_TYPES.find((c) => c.type === type)!.label;

/** A saved code's name: its title, else the link it holds, else its type. */
export function codeName(code: Pick<Code, "title" | "contentType" | "destination">): string {
	return code.title ?? (code.contentType === "link" ? prettyUrl(code.destination) : contentLabel(code.contentType));
}


/** "kofi-chops.com/menu" from "https://kofi-chops.com/menu/". */
function linkTitle(url: string): string {
	const parsed = URL.parse(url);
	return parsed ? `${parsed.host}${parsed.pathname}`.replace(/\/$/, "") : url;
}

/** The name a new code gets in Your codes: the link, network, person, number or address it holds. */
export function contentTitle(type: ContentType, fields: Fields): string {
	const title = {
		link: () => linkTitle(withScheme(fields.link.url.trim())),
		wifi: () => fields.wifi.ssid.trim(),
		contact: () => fields.contact.name.trim(),
		sms: () => fields.sms.phone.trim(),
		email: () => fields.email.to.trim(),
	}[type]();
	return title.slice(0, MAX_TITLE_LENGTH);
}

export interface HeldField {
	label: string;
	value: string;
	/** Hidden until asked for (a Wi-Fi password). */
	secret?: boolean;
}

// Inverse of the escaping in @qr-daddy/qr payloads: a backslash keeps the next character.
const unescapeField = (value: string) => value.replace(/\\(.)/g, (_, c: string) => (c === "n" ? "\n" : c));

/** Splits on `separator` where it isn't escaped with a backslash. */
function splitUnescaped(text: string, separator: string): string[] {
	const parts: string[] = [];
	let current = "";
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "\\" && i + 1 < text.length) {
			current += text[i] + text[i + 1];
			i++;
		} else if (text[i] === separator) {
			parts.push(current);
			current = "";
		} else current += text[i];
	}
	parts.push(current);
	return parts;
}

function wifiFields(text: string): HeldField[] | null {
	if (!text.startsWith("WIFI:")) return null;
	const values = new Map<string, string>();
	for (const part of splitUnescaped(text.slice(5), ";")) {
		const at = part.indexOf(":");
		if (at > 0) values.set(part.slice(0, at), unescapeField(part.slice(at + 1)));
	}
	const ssid = values.get("S");
	if (ssid === undefined) return null;
	const open = values.get("T") === "nopass";
	const held: HeldField[] = [{ label: "Network name", value: ssid }];
	const password = values.get("P");
	held.push(open || !password ? { label: "Password", value: "None" } : { label: "Password", value: password, secret: true });
	return held;
}

function contactFields(text: string): HeldField[] | null {
	if (!text.startsWith("BEGIN:VCARD")) return null;
	const labels: Record<string, string> = { FN: "Name", TEL: "Phone", EMAIL: "Email", ORG: "Business", URL: "Website" };
	const held: HeldField[] = [];
	for (const line of text.split(/\r?\n/)) {
		const at = line.indexOf(":");
		const key = line.slice(0, at).split(";")[0];
		if (at > 0 && labels[key]) held.push({ label: labels[key], value: unescapeField(line.slice(at + 1)) });
	}
	return held.length ? held : null;
}

function smsFields(text: string): HeldField[] | null {
	if (!text.startsWith("SMSTO:")) return null;
	const rest = text.slice(6);
	const at = rest.indexOf(":");
	const held = [{ label: "Phone number", value: at < 0 ? rest : rest.slice(0, at) }];
	if (at >= 0) held.push({ label: "Message", value: rest.slice(at + 1) });
	return held;
}

function emailFields(text: string): HeldField[] | null {
	if (!text.startsWith("mailto:")) return null;
	const [to, query = ""] = text.slice(7).split("?");
	const params = new URLSearchParams(query);
	const held = [{ label: "Send to", value: to }];
	if (params.get("subject")) held.push({ label: "Subject", value: params.get("subject")! });
	if (params.get("body")) held.push({ label: "Message", value: params.get("body")! });
	return held;
}

/**
 * What a saved static code holds, read back from its QR text for people: the network name and
 * password, the contact's details, the link. Falls back to the raw text when it can't be read.
 */
export function heldFields(type: ContentType, text: string): HeldField[] {
	const parsed = {
		link: () => [{ label: "Link", value: text }],
		wifi: () => wifiFields(text),
		contact: () => contactFields(text),
		sms: () => smsFields(text),
		email: () => emailFields(text),
	}[type]();
	return parsed ?? [{ label: "Text", value: text }];
}
