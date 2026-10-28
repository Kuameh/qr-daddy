import { describe, expect, it } from "vitest";
import { payloads } from "../src";

describe("payloads", () => {
	it("escapes Wi-Fi special characters", () => {
		expect(payloads.wifi({ ssid: "Kofi;Chop:Bar", password: 'p"a,ss\\' }))
			.toBe(String.raw`WIFI:T:WPA;S:Kofi\;Chop\:Bar;P:p\"a\,ss\\;;`);
	});
	it("omits the password on open networks and flags hidden ones", () => {
		expect(payloads.wifi({ ssid: "Guest", security: "nopass", hidden: true })).toBe("WIFI:T:nopass;S:Guest;H:true;;");
	});
	it("builds a vCard 3.0 contact", () => {
		expect(payloads.contact({ name: "Ama Mensah", phone: "+233 24 412 3456", org: "Kofi's, Osu" }).split("\n")).toEqual([
			"BEGIN:VCARD", "VERSION:3.0", "FN:Ama Mensah", "N:Ama Mensah;;;;", "ORG:Kofi's\\, Osu", "TEL;TYPE=CELL:+233 24 412 3456", "END:VCARD",
		]);
	});
	it("builds SMS and email", () => {
		expect(payloads.sms({ phone: "+233244123456", message: "Table 4 please" })).toBe("SMSTO:+233244123456:Table 4 please");
		expect(payloads.email({ to: "hi@kofi-chops.com", subject: "Party booking", body: "For 12 people" }))
			.toBe("mailto:hi@kofi-chops.com?subject=Party%20booking&body=For%2012%20people");
	});
});
