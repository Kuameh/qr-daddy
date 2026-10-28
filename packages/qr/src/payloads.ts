// Builders for the text a QR code carries, one per content type. Phone camera apps
// recognise these formats and offer the matching action (join Wi-Fi, save contact…).

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface Wifi { ssid: string; password?: string; security?: WifiSecurity; hidden?: boolean }
export interface Contact { name: string; phone?: string; email?: string; org?: string; url?: string }
export interface Sms { phone: string; message?: string }
export interface Email { to: string; subject?: string; body?: string }

// Wi-Fi and MECARD values escape \ ; , : and " with a backslash.
const escapeField = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");

// vCard 3.0 escapes \ ; , and newlines (RFC 2426 §4).
const escapeVcard = (value: string) => value.replace(/([\\;,])/g, "\\$1").replace(/\n/g, "\\n");

export function wifi({ ssid, password = "", security = "WPA", hidden = false }: Wifi): string {
	const parts = [`T:${security}`, `S:${escapeField(ssid)}`];
	if (security !== "nopass") parts.push(`P:${escapeField(password)}`);
	if (hidden) parts.push("H:true");
	return `WIFI:${parts.join(";")};;`;
}

export function contact({ name, phone, email, org, url }: Contact): string {
	const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${escapeVcard(name)}`, `N:${escapeVcard(name)};;;;`];
	if (org) lines.push(`ORG:${escapeVcard(org)}`);
	if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
	if (email) lines.push(`EMAIL:${email}`);
	if (url) lines.push(`URL:${url}`);
	lines.push("END:VCARD");
	return lines.join("\n");
}

export function sms({ phone, message = "" }: Sms): string {
	return message ? `SMSTO:${phone}:${message}` : `SMSTO:${phone}`;
}

export function email({ to, subject, body }: Email): string {
	const query = new URLSearchParams();
	if (subject) query.set("subject", subject);
	if (body) query.set("body", body);
	// URLSearchParams encodes spaces as "+", which mail apps show literally.
	const qs = query.toString().replace(/\+/g, "%20");
	return `mailto:${to}${qs ? `?${qs}` : ""}`;
}
