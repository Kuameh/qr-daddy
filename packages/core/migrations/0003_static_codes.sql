-- Signed-in people keep every code they download, not only dynamic ones.
--
-- kind 'dynamic': encodes its short link (slug), destination is an http(s) link, has scans.
-- kind 'static':  encodes `destination` itself (the exact QR text), has no slug and no scans.
-- content_type is what the code holds; dynamic codes are always links.
--
-- slug becomes nullable, which SQLite can only do by rebuilding the table. scans references
-- codes(id), so foreign key checks are deferred to the end of the migration: rows are copied
-- with the same ids before the old table is dropped, and the new one takes its name.

PRAGMA defer_foreign_keys = true;

CREATE TABLE codes_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL DEFAULT 'dynamic' CHECK (kind IN ('dynamic', 'static')),
  content_type TEXT NOT NULL DEFAULT 'link' CHECK (content_type IN ('link', 'wifi', 'contact', 'sms', 'email')),
  -- Unique across deleted codes too, so a printed short link is never reassigned. NULLs don't collide.
  slug TEXT UNIQUE,
  destination TEXT NOT NULL,
  title TEXT,
  style_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  -- A dynamic code is a short link to a link; a static code has neither.
  CHECK ((kind = 'dynamic') = (slug IS NOT NULL)),
  CHECK (kind = 'static' OR content_type = 'link')
);

INSERT INTO codes_new (id, user_id, kind, content_type, slug, destination, title, style_json, created_at, updated_at, deleted_at)
SELECT id, user_id, 'dynamic', 'link', slug, destination, title, style_json, created_at, updated_at, deleted_at FROM codes;

DROP TABLE codes;
ALTER TABLE codes_new RENAME TO codes;

CREATE INDEX codes_user_created ON codes (user_id, created_at);

-- One live static code per person per content: downloading the same code again finds it
-- (createCode upserts on this index) instead of adding a second row.
CREATE UNIQUE INDEX codes_user_static_destination ON codes (user_id, destination)
  WHERE kind = 'static' AND deleted_at IS NULL;

PRAGMA defer_foreign_keys = false;
