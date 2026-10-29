// The sign-in email, sent by /api/auth/link through Resend.
//
// Email clients ignore CSS variables and most modern CSS, so this is tables with inline styles and
// the design-system colours written out (docs/DESIGN_SYSTEM.md § Email). The <head> declares light
// and dark support and carries a real dark palette, so Apple Mail and Outlook use our dark version
// instead of inverting the light one. The button's hard shadow is thick right/bottom borders,
// because Gmail drops box-shadow.

const escapeHtml = (value: string) =>
	value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const DISPLAY = "'Bricolage Grotesque','Arial Black',Arial,sans-serif";
const BODY = "Geist,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

export function signInEmail(link: string): { subject: string; html: string; text: string } {
	const href = escapeHtml(link);
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>Sign in to QR Daddy</title>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Geist:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  body { margin: 0; padding: 0; }
  @media (max-width: 480px) {
    .card { padding: 28px 20px !important; }
    .title { font-size: 34px !important; }
  }
  /* Dark palette from the app's dark tokens (globals.css). Outlook.com marks dark mode with data-ogsc/ogsb. */
  @media (prefers-color-scheme: dark) {
    .page { background-color: #131315 !important; }
    .card { background-color: #1C1C1F !important; border-color: #2C2C30 !important; }
    .ink { color: #EDEDE8 !important; }
    .soft { color: #B4B4BB !important; }
    .muted, .muted a { color: #9A9AA2 !important; }
    .rule { border-color: #2C2C30 !important; }
    .button { background-color: #2B4BFF !important; border-color: #EDEDE8 !important; }
    .button a { color: #FFFFFF !important; }
    .muted a.link { color: #8EA0FF !important; }
  }
  [data-ogsb] .page { background-color: #131315 !important; }
  [data-ogsb] .card { background-color: #1C1C1F !important; }
  [data-ogsc] .ink { color: #EDEDE8 !important; }
  [data-ogsc] .soft { color: #B4B4BB !important; }
  [data-ogsc] .muted { color: #9A9AA2 !important; }
  [data-ogsc] .button a { color: #FFFFFF !important; }
</style>
</head>
<body class="page" style="margin:0;padding:0;background-color:#F7F7F5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your sign-in link for QR Daddy. It works once, for 15 minutes.</div>
  <table role="presentation" class="page" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F7F5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td class="ink" style="padding:0 4px 20px 4px;font-family:${DISPLAY};font-size:24px;font-weight:800;letter-spacing:-1px;color:#111114;">qr daddy.</td>
          </tr>
          <tr>
            <td class="card" style="background-color:#FFFFFF;border:1px solid #E6E6E1;border-radius:16px;padding:36px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="title ink" style="font-family:${DISPLAY};font-size:40px;line-height:1;font-weight:800;letter-spacing:-1.5px;color:#111114;padding-bottom:16px;">Here's your sign-in link.</td>
                </tr>
                <tr>
                  <td class="soft" style="font-family:${BODY};font-size:16px;line-height:24px;color:#55555C;padding-bottom:28px;">
                    Tap the button, then press <strong class="ink" style="color:#111114;font-weight:500;">Continue</strong> on the page that opens. The link works once, for 15 minutes.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:28px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td class="button" style="background-color:#2B4BFF;border-top:2px solid #111114;border-left:2px solid #111114;border-right:6px solid #111114;border-bottom:6px solid #111114;border-radius:12px;">
                          <a href="${href}" style="display:inline-block;padding:14px 24px;font-family:${BODY};font-size:16px;font-weight:500;line-height:20px;color:#FFFFFF;text-decoration:none;">Sign in to QR Daddy</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td class="rule muted" style="border-top:1px solid #E6E6E1;padding-top:20px;font-family:${BODY};font-size:14px;line-height:20px;color:#6B6B72;">
                    Button not working? Copy this link into your browser:<br>
                    <a class="link" href="${href}" style="color:#2B4BFF;word-break:break-all;">${href}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="muted" style="padding:20px 4px 0 4px;font-family:${BODY};font-size:13px;line-height:20px;color:#6B6B72;">
              Didn't ask to sign in? You can ignore this email. Nobody can get into your account without this link.<br><br>
              QR Daddy · <a href="https://qr.ashiangmor.com" style="color:#6B6B72;">qr.ashiangmor.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

	const text = `Here's your sign-in link for QR Daddy:

${link}

Open it, then press Continue on the page that opens. The link works once, for 15 minutes.

Didn't ask to sign in? You can ignore this email. Nobody can get into your account without this link.

QR Daddy · https://qr.ashiangmor.com
`;

	return { subject: "Sign in to QR Daddy", html, text };
}
