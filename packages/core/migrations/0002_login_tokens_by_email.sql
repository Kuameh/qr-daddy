-- requestMagicLink counts an email's unexpired links to rate-limit sign-in emails.
CREATE INDEX login_tokens_email_expires ON login_tokens (email, expires_at);
