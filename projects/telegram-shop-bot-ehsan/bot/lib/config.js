// Tunable behaviour. No secrets here — the bot token lives with Telegram
// Serverless, and the admin's telegram id is stored in the `settings` table at
// runtime (see lib/admin.js), so nothing identifying is committed.

// A price older than this is not quoted as firm; the card shows «نیاز به استعلام».
// Supplier channels update daily, so a week is already generous.
export const FRESHNESS_DAYS = 7;

// Posts older than this drop out of search entirely, keeping the index small
// and stopping ancient prices from ever surfacing.
export const POST_MAX_AGE_DAYS = 45;

// How many candidate products to offer when a search is ambiguous.
export const MAX_RESULTS = 5;

// Runner-up suppliers listed under each line of Ehsan's order notification.
export const MAX_ALTERNATIVES = 3;

export const DAY = 86400;

export const now = () => Math.floor(Date.now() / 1000);
