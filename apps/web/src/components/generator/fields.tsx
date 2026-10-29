import type { ReactNode } from "react";
import type { ContentType, Fields } from "./content";

type Update = <T extends ContentType>(type: T, patch: Partial<Fields[T]>) => void;

export const inputClass =
	"h-12 w-full rounded-xl border border-line-strong bg-surface px-3.5 text-base outline-none focus:border-ink md:h-11.5";

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<label className="flex flex-col gap-1.5">
			<span className="text-sm font-medium">{label}</span>
			{children}
		</label>
	);
}

export function ContentFields({ type, fields, update }: { type: ContentType; fields: Fields; update: Update }) {
	switch (type) {
		case "link":
			return (
				<Field label="Link">
					<input className={inputClass} inputMode="url" autoComplete="url" placeholder="kofi-chops.com/menu"
						value={fields.link.url} onChange={(e) => update("link", { url: e.target.value })} />
				</Field>
			);
		case "wifi":
			return (
				<div className="flex flex-col gap-3">
					<Field label="Network name">
						<input className={inputClass} placeholder="Kofi Chop Bar" value={fields.wifi.ssid}
							onChange={(e) => update("wifi", { ssid: e.target.value })} />
					</Field>
					{!fields.wifi.open && (
						<Field label="Password">
							<input className={inputClass} value={fields.wifi.password}
								onChange={(e) => update("wifi", { password: e.target.value })} />
						</Field>
					)}
					<label className="flex min-h-11 items-center gap-2.5 text-sm">
						<input type="checkbox" className="size-4.5 accent-ink" checked={fields.wifi.open}
							onChange={(e) => update("wifi", { open: e.target.checked })} />
						No password
					</label>
				</div>
			);
		case "contact":
			return (
				<div className="flex flex-col gap-3">
					<Field label="Name">
						<input className={inputClass} autoComplete="name" placeholder="Ama Mensah" value={fields.contact.name}
							onChange={(e) => update("contact", { name: e.target.value })} />
					</Field>
					<Field label="Phone">
						<input className={inputClass} type="tel" autoComplete="tel" placeholder="024 412 3456" value={fields.contact.phone}
							onChange={(e) => update("contact", { phone: e.target.value })} />
					</Field>
					<Field label="Email">
						<input className={inputClass} type="email" autoComplete="email" value={fields.contact.email}
							onChange={(e) => update("contact", { email: e.target.value })} />
					</Field>
					<Field label="Business">
						<input className={inputClass} autoComplete="organization" value={fields.contact.org}
							onChange={(e) => update("contact", { org: e.target.value })} />
					</Field>
				</div>
			);
		case "sms":
			return (
				<div className="flex flex-col gap-3">
					<Field label="Phone number">
						<input className={inputClass} type="tel" placeholder="024 412 3456" value={fields.sms.phone}
							onChange={(e) => update("sms", { phone: e.target.value })} />
					</Field>
					<Field label="Message">
						<textarea className={`${inputClass} h-24 py-3 md:h-24`} placeholder="Table for 4 tonight, please" value={fields.sms.message}
							onChange={(e) => update("sms", { message: e.target.value })} />
					</Field>
				</div>
			);
		case "email":
			return (
				<div className="flex flex-col gap-3">
					<Field label="Send to">
						<input className={inputClass} type="email" placeholder="hello@kofi-chops.com" value={fields.email.to}
							onChange={(e) => update("email", { to: e.target.value })} />
					</Field>
					<Field label="Subject">
						<input className={inputClass} value={fields.email.subject}
							onChange={(e) => update("email", { subject: e.target.value })} />
					</Field>
					<Field label="Message">
						<textarea className={`${inputClass} h-24 py-3 md:h-24`} value={fields.email.body}
							onChange={(e) => update("email", { body: e.target.value })} />
					</Field>
				</div>
			);
	}
}
