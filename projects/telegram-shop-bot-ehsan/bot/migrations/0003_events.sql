-- Customer footprints, for the admin report: who appeared, what they searched,
-- what they ordered. Coarse on purpose — no per-tap logging.
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id      INTEGER NOT NULL,
  kind       TEXT NOT NULL,
  detail     TEXT,
  found      INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_events_created ON events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_owner   ON events (tg_id);
