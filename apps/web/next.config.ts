import type { NextConfig } from "next";

const config: NextConfig = {
	// The QR package ships TypeScript source, so Next compiles it with the app.
	transpilePackages: ["@qr-daddy/qr"],
};

export default config;
