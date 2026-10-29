import { APP_ORIGIN, recordScan, resolveSlug, type Deps, type Device } from "@qr-daddy/core";

const BOT = /bot|crawler|spider|preview/i;
const TABLET = /ipad|tablet|kindle|silk|playbook|android(?!.*mobile)/i;
const MOBILE = /mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i;

export function deviceClass(userAgent: string): Device {
  if (TABLET.test(userAgent)) return "tablet";
  if (MOBILE.test(userAgent)) return "mobile";
  return "desktop";
}

function referrerHost(request: Request): string | null {
  const referer = request.headers.get("Referer");
  return referer ? (URL.parse(referer)?.hostname ?? null) : null;
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

const NOT_ACTIVE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QR code not active</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">
<p>This QR code isn't active anymore.</p>
<p><a href="${APP_ORIGIN}">Make your own QR code at QR Daddy</a></p>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    // Link rewriters and some scanner apps add a trailing slash; the slug is what's between them.
    const slug = new URL(request.url).pathname.replace(/^\/+|\/+$/g, "");
    if (slug === "") return redirect(APP_ORIGIN);

    const deps: Deps = { db: env.DB, kv: env.LINKS };
    const target = await resolveSlug(deps, slug);
    if (!target) {
      return new Response(NOT_ACTIVE, {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    const userAgent = request.headers.get("User-Agent") ?? "";
    if (request.method === "GET" && !BOT.test(userAgent)) {
      ctx.waitUntil(
        recordScan(deps, {
          codeId: target.codeId,
          country: request.cf?.country ?? null,
          city: request.cf?.city ?? null,
          device: deviceClass(userAgent),
          referrerHost: referrerHost(request),
        }),
      );
    }
    return redirect(target.destination);
  },
} satisfies ExportedHandler<Env>;
