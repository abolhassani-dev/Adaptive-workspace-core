-- Initial schema. Mirrors src/schema.js exactly.
-- No foreign keys anywhere: relations are plain integer columns, enforced in
-- application code, so a deleted parent can never block or cascade unexpectedly.

CREATE TABLE IF NOT EXISTS posts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id     INTEGER NOT NULL,
  chat_id        INTEGER NOT NULL,
  media_group_id TEXT,
  caption        TEXT DEFAULT '',
  search_text    TEXT DEFAULT '',
  title          TEXT DEFAULT '',
  description    TEXT DEFAULT '',
  photo_ids      TEXT,
  price          INTEGER,
  supplier       TEXT,
  product_id     INTEGER,
  posted_at      INTEGER NOT NULL,
  active         INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_posts_group   ON posts (media_group_id);
CREATE INDEX IF NOT EXISTS idx_posts_msg     ON posts (message_id);
CREATE INDEX IF NOT EXISTS idx_posts_product ON posts (product_id);
CREATE INDEX IF NOT EXISTS idx_posts_posted  ON posts (posted_at);

CREATE TABLE IF NOT EXISTS products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  search_name TEXT NOT NULL,
  photo_id    TEXT,
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS aliases (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  alias      TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_aliases_product ON aliases (product_id);
CREATE INDEX IF NOT EXISTS idx_aliases_alias   ON aliases (alias);

CREATE TABLE IF NOT EXISTS customers (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id      INTEGER NOT NULL UNIQUE,
  name       TEXT,
  phone      TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id      INTEGER NOT NULL,
  post_id    INTEGER,
  title      TEXT NOT NULL,
  qty        INTEGER NOT NULL,
  unit_price INTEGER,
  added_at   INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_cart_owner ON cart_items (tg_id);

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id          INTEGER NOT NULL,
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT DEFAULT 'new',
  total          INTEGER,
  created_at     INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);

CREATE TABLE IF NOT EXISTS order_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id        INTEGER NOT NULL,
  title           TEXT NOT NULL,
  qty             INTEGER NOT NULL,
  unit_price      INTEGER,
  supplier        TEXT,
  post_message_id INTEGER,
  posted_at       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);

CREATE TABLE IF NOT EXISTS unmatched (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  phrase        TEXT NOT NULL,
  search_phrase TEXT NOT NULL,
  hits          INTEGER DEFAULT 1,
  resolved      INTEGER DEFAULT 0,
  last_at       INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_unmatched_resolved ON unmatched (resolved);

CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id      INTEGER NOT NULL UNIQUE,
  state      TEXT DEFAULT 'idle',
  data       TEXT,
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS settings (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  key   TEXT NOT NULL UNIQUE,
  value TEXT
);
