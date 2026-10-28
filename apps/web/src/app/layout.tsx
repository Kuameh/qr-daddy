import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: "800", variable: "--font-bricolage" });

export const metadata: Metadata = {
	title: "QR Daddy · Free QR code generator",
	description: "Make QR codes with dots, colours and your logo. Free, no account.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={`${geist.variable} ${bricolage.variable}`}>
			<body>{children}</body>
		</html>
	);
}
