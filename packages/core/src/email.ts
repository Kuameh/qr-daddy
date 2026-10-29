export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** The sign-in email. `link` is the full app URL carrying the token from `requestMagicLink`. */
export function magicLinkEmail({ link }: { link: string }): EmailContent {
  const note =
    "The link works once and stops working after 15 minutes. If you didn't ask to sign in, you can ignore this email.";
  const href = escapeHtml(link);
  return {
    subject: "Sign in to QR Daddy",
    text: `Use this link to sign in to QR Daddy:\n\n${link}\n\n${note}\n`,
    html: `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5;">
    <p>Use this link to sign in to QR Daddy:</p>
    <p><a href="${href}">Sign in to QR Daddy</a></p>
    <p>${note}</p>
    <p>If the link doesn't open, paste this into your browser:<br>${href}</p>
  </body>
</html>
`,
  };
}
