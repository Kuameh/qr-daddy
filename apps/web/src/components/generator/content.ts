import { payloads } from "@qr-daddy/qr";

export type ContentType = "link" | "wifi" | "contact" | "sms" | "email";

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
