# Orientation for AI coding assistants

A Telegram storefront bot for Ehsan, who brokers confectionery supplies. He holds no
stock, but he **curates his own Telegram channel as his catalogue** — one post per
product, with photos, name and price, arranged by him. The bot is admin in that channel,
indexes every post, and sells from that index. **The bot's job ends at lead generation**
— it quotes a price and captures an order, then Ehsan phones his supplier and his
customer himself. No payment, no logistics, no inventory.

Full design rationale is in `../DESIGN.md`; decisions and rejected options in
`../DECISIONS.md`. Read those before changing behaviour — most of what looks like a
missing feature was ruled out on purpose.

## Platform (Cloudflare Workers + D1)

- `src/index.js` is the Worker entry: it verifies Telegram's secret header, calls
  `init(env)`, and routes the update to the matching handler in `src/handlers/`.
- `src/sdk.js` exposes `db` and `api` as `export let`, assigned per request by `init()`.
  ES module live bindings are what let every module keep importing them as plain values.
- `src/db.js` is a thin compatibility layer over Drizzle. `boolean()` and `json()` are
  sugar over `integer(…, {mode:'boolean'})` and `text(…, {mode:'json'})`.
- Schema changes need a matching SQL file in `migrations/`; Drizzle does not create
  tables here. Keep `src/schema.js` and the migration in step.
- No foreign keys — relations are plain integer columns, enforced in app code.
- **Always return HTTP 200**, even on error. A non-200 makes Telegram retry the same
  update forever, which would replay orders and re-notify Ehsan.
- `allowed_updates` must include `channel_post` when registering the webhook, or the
  bot never sees a single product.
- Images are never stored or fetched — only Telegram `file_id` strings are passed around.

## Invariants — do not break these

1. **The bot composes its own product card** and never forwards or copies a post, and
   `sanitize()` in `src/lib/text.js` strips usernames, links and phone numbers from every
   description shown to a customer. Ehsan curates his own channel now, so this is a
   safety net rather than the front line — but it stays: the moment he pastes text from a
   supplier, it is the only thing stopping their contact details reaching his customer.
2. **An ambiguous price is no price.** `parsePrice()` returns null when a caption yields
   several different numbers. Do not "improve" it into guessing the first or lowest one.
   A wrong price reaches a customer as fact; a missing one just means Ehsan quotes by phone.
3. **Every quote carries its date**, and prices past `FRESHNESS_DAYS` are shown as
   «نیاز به استعلام» rather than as firm.
3b. **Newest post wins, not cheapest.** The channel is Ehsan's own catalogue, so a later
   post for the same product is the current price — including a price rise. Ranking by
   cheapest would quote a superseded price back at him.
4. **Ehsan never does data entry.** He trades in hundreds of items. The catalogue is
   built from the unmatched-search queue one tap at a time, and the bot works with an
   empty catalogue on day one via normalized text search. Any feature that requires him
   to enter products up front will simply not be used.
5. **Cart totals are labelled «تقریبی».** Ehsan confirms every price by phone.
5b. **Phone numbers render in Latin digits**, normalised to `09…`. Telegram only turns a
   number into a tap-to-call link in Latin digits, and calling the customer is the job.
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

The whole bot runs locally with no Cloudflare account and no real bot token:

```bash
npx wrangler d1 migrations apply ehsan-shop-bot --local
npx wrangler dev --local          # with .dev.vars setting TELEGRAM_API_BASE
```

`TELEGRAM_API_BASE` exists for exactly this — point it at a stub HTTP server that logs
what the bot sends, then POST synthetic updates at the Worker and read the conversation
back. That is how the flows in this project were verified: channel posts (including
albums), search, cart, checkout, the order notification, and the alias learning loop.

The pure logic in `src/lib/text.js` and `src/lib/price.js` is where the subtle bugs live
and is worth exercising directly with node as well.
