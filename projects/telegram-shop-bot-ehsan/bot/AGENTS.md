# Orientation for AI coding assistants

A Telegram storefront bot for Ehsan, who brokers confectionery supplies. He holds no
stock: other shops post products and prices in their channels, he forwards those posts
into his own channel, and he sells the goods on to his customers for a commission on
the supplier's invoice. **The bot's job ends at lead generation** — it quotes a price
and captures an order, then Ehsan phones the supplier and the customer himself. No
payment, no logistics, no inventory.

Full design rationale is in `../DESIGN.md`; decisions and rejected options in
`../DECISIONS.md`. Read those before changing behaviour — most of what looks like a
missing feature was ruled out on purpose.

## Platform rules (Telegram Serverless)

- Only `schema.js` and `.js` files under `lib/` and `handlers/` are deployed.
- Imports are bare names: `sdk`, `sdk/db`, `schema`, `lib/…`.
- **No npm packages.** Official SDK and local modules only.
- Every `db` call is async.
- No foreign keys; relations are plain integer columns.
- One handler per update type, default-exported, flat in `handlers/`.
- Two-step deploy: `npx tgcloud push` (code), then `npx tgcloud migrate` (schema).
- File bytes cannot be uploaded or downloaded from a handler. This bot never needs to —
  it passes Telegram `file_id` strings around and never touches image data.

## Invariants — do not break these

1. **The customer never learns which shop the goods come from.** The bot composes its
   own product card and never forwards or copies a supplier post, and `sanitize()` in
   `lib/text.js` strips usernames, links and phone numbers from every description shown
   to a customer. If the customer can reach the supplier, Ehsan's business disappears.
2. **An ambiguous price is no price.** `parsePrice()` returns null when a caption yields
   several different numbers. Do not "improve" it into guessing the first or lowest one.
   A wrong price reaches a customer as fact; a missing one just means Ehsan quotes by phone.
3. **Every quote carries its date**, and prices past `FRESHNESS_DAYS` are shown as
   «نیاز به استعلام» rather than as firm.
4. **Ehsan never does data entry.** He trades in hundreds of items. The catalogue is
   built from the unmatched-search queue one tap at a time, and the bot works with an
   empty catalogue on day one via normalized text search. Any feature that requires him
   to enter products up front will simply not be used.
5. **Cart totals are labelled «تقریبی».** Ehsan confirms every price by phone.
6. **No `parse_mode` anywhere.** Supplier captions and customer names are arbitrary text;
   routing them through a Markdown or HTML parser turns a stray character into a failed
   send. Structure comes from emoji and line breaks.

## Persian text gotchas

- `normalize()` in `lib/text.js` is the single normalizer, and **both** indexed post text
  and customer queries must pass through it or matching silently fails.
- JavaScript's `\b` is defined over `[A-Za-z0-9_]`, so it never matches next to a Persian
  letter. A regex ending `تومان\b` matches nothing. Use a lookahead like `(?![؀-ۿ])`.
  This exact bug once made every price parse return null.
- Persian and Arabic digits, ZWNJ, and ي/ی + ك/ک all need folding — suppliers mix them
  freely within a single post.

## Testing

There is no test runner on the platform. The pure logic in `lib/text.js` and
`lib/price.js` is where the real risk lives and is worth exercising directly with node
before deploying. `npx tgcloud run handlers/message '{...}'` runs a handler locally
against a synthetic update.
