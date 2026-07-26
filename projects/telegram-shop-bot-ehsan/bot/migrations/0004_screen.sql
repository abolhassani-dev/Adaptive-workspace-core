-- The bot keeps one message per customer and rewrites it as they move through
-- the flow, instead of posting a new message each step. These remember which
-- message that is, and whether it currently holds a photo or plain text —
-- Telegram cannot turn one into the other by editing, so a change of kind means
-- the old message is deleted and a new one takes its place.
ALTER TABLE sessions ADD COLUMN screen_id INTEGER;
ALTER TABLE sessions ADD COLUMN screen_kind TEXT;
