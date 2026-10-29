-- All times are integer epoch milliseconds.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE, -- stored lowercased
  created_at INTEGER NOT NULL
);

-- Only the SHA-256 hash of a sign-in link token is stored.
CREATE TABLE login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

-- Only the SHA-256 hash of a session cookie value is stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Slugs stay unique across deleted codes, so a printed code is never reassigned.
CREATE TABLE codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  slug TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  title TEXT,
  style_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);

CREATE INDEX codes_user_created ON codes (user_id, created_at);

CREATE TABLE scans (
  id INTEGER PRIMARY KEY,
  code_id TEXT NOT NULL REFERENCES codes(id),
  scanned_at INTEGER NOT NULL,
  country TEXT,
  city TEXT,
  device TEXT,
  referrer_host TEXT
);

CREATE INDEX scans_code_time ON scans (code_id, scanned_at);
