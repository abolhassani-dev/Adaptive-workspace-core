-- Fields from the posting template (POSTING-GUIDE.md): line 3 is the material,
-- line 4 is the units per pack. They get their own columns rather than being
-- folded into the description, so the product card can label them separately.
ALTER TABLE posts ADD COLUMN material TEXT;
ALTER TABLE posts ADD COLUMN pack TEXT;
