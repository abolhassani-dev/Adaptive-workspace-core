# Telegram Shop Bot — Ehsan (Confectionery Supplies Brokerage)

## Goal
Ehsan sells confectionery/pastry supplies (لوازم قنادی) as a **broker**: he does not hold
stock. Other shops publish daily product+price lists in their own Telegram channels; Ehsan
sells their goods to his own customers and earns his margin as commission on the supplier's
invoice.

Ehsan curates **his own Telegram channel** as his catalogue — one post per product, with
his photos, names and prices — and his bot is admin there. That channel is the reference:
whatever is in it can be quoted to customers, and re-posting an item is how he changes its
price.

He wants a Telegram bot to hand to his customers that acts as his storefront:
1. Customer taps «استعلام کالا» and types a product name in their own words.
2. The bot searches the indexed posts, finds the product, and shows a standardized card —
   photo(s), the price from the newest post, its date, and a sanitized description.
3. Customer adds items to a cart and submits a preliminary order (name, phone).
4. Ehsan gets one Telegram notification per order: which customer, what items and quantities,
   the price for each, and a link to the post — with the customer's phone tappable to call.
5. Ehsan then phones the supplier to confirm stock/price, then phones his customer and
   closes the deal manually. **The bot stops at lead generation** — no payment, no logistics.

Success = Ehsan operates the whole thing from inside Telegram alone, with no computer skills,
and stops losing orders to manual back-and-forth. Concretely: his customers self-serve a price
and place an order, and Ehsan grows the product catalogue himself, one tap at a time, without
asking anyone for help.

## Nature
**Software project** (Telegram bot + post indexer), with a real product/UX dimension because
the operator is non-technical. Not a content or marketing project.

## Dimensions

### Essential
- **Goal & core problem** — broker workflow: search suppliers → quote → capture lead → notify
- **Software development** — bot + post indexer + storage; this is the deliverable
- **Integrations** — Telegram Bot API only. Ehsan forwards supplier posts into his own
  channel where the bot is admin, so no second access path is needed.
- **Data & analytics (product identity)** — the hard core of the project: the same physical
  item appears under many names across channels ("قالب کیک یزدی" = "کاسه ۸.۵" = …).
  Needs an alias/synonym layer that Ehsan grows himself over time.
- **Price parsing & freshness** — Persian numerals, mixed formats (۱۸۵٫۰۰۰ / ۱۸۵ هزار / ۱۸۵ت),
  and a stale price is worse than no price. Every quote must carry its post date.
- **UX for a non-technical operator** — Ehsan's admin panel lives in Telegram, is
  button-driven, and never asks him to type structured data or understand a concept.
- **Privacy** — the bot stores customers' real names and phone numbers. Minimum collection,
  no export, no sharing, and the supplier's identity is never shown to the customer.
- **Content sanitization** — supplier photos and descriptions now reach the customer, and
  supplier captions carry their own @username / links / phone numbers. Stripping that is what
  actually enforces "the customer never learns the supplier". Not cosmetic.
- **Security & secrets** — the bot token is a credential. Never in this repo; environment
  variables / server-side only.
- **Operations & maintenance** — the owner (not Ehsan) runs it. If Ehsan stops forwarding,
  the index silently ages into wrong prices, so it needs a daily liveness signal.
- **Cost** — must be **zero**, and stable, per the owner. Achieved: Telegram Serverless runs
  the code on Telegram's own infrastructure with a built-in database, and images are never
  stored (only Telegram `file_id`).

### Optional
- **Business model support (markup)** — bot could add a % markup on top of the supplier
  price instead of quoting it raw. Propose only if Ehsan's commission model changes.

### Deferred
- **Reporting/accounting** — activates when Ehsan asks to track commissions and profit.
- **Multi-operator** — activates if Ehsan hires an assistant to handle orders.
- **Handing the bot to other shopkeepers** — would activate Telegram's Managed Bots
  (Bot API 9.6); noted so it isn't rediscovered later.
- **Legal/regulatory** — activates only if the bot starts taking payments.

### Irrelevant
Payments, logistics/shipping, inventory management, web dashboard, invoicing.
**Image/OCR price extraction** — ruled out, not deferred: supplier posts carry name, photo and
description as *text*, so there is nothing to OCR.
**Per-supplier trust ranking** — dropped: Ehsan's own channel is the single reference, so
ranking sources was ceremony.

*(Multi-item orders moved from deferred into v1 as the cart, at the owner's request.)*

## Capability gaps
- **Reading supplier channels** — **resolved, no gap.** A bot cannot read channels it isn't in,
  but Ehsan already forwards supplier posts into his own channel where the bot is admin. Plain
  Bot API suffices; `forward_origin` even identifies the source supplier automatically. The
  MTProto reader, its dedicated phone number and its account risk are all gone.
  See DECISIONS 2026-07-26.
- **Hosting at zero cost** — **resolved: Cloudflare Workers + D1** free tier. Telegram
  Serverless was preferred but is not available for this account (owner checked BotFather).
  Free tier allows commercial use and needs no credit card; the bot is webhook-driven so
  nothing idles. See DECISIONS 2026-07-26.
- **Persian product-name matching** — no external tool needed. Normalization (Arabic/Persian
  character folding, digit folding, ZWNJ) + Ehsan-curated aliases + an unmatched-search
  learning queue. Built-in capability, no dependency.
- **Price parsing from free-form Persian captions** — no external tool needed; ambiguous cases
  must resolve to "no price" rather than a guess.

## Toolbox (this project)
- **Cloudflare Workers + D1** — host for the bot's code and database. Role: runs everything;
  free tier, no credit card, commercial use permitted. Access: a Cloudflare account; the bot
  token and webhook secret are stored as Worker secrets, never in this repo.
- **Drizzle ORM** — the query layer over D1. Adopted because it let the entire existing data
  layer carry over behind a thin compatibility shim instead of being rewritten.

## Open questions
Answered at intake round 2: channels are handled by Ehsan forwarding into his own channel;
posts are name + photo + text description; hundreds of products; the customer must never see
the supplier's name (confirmed); hosting must be zero-cost.

Answered at intake round 3: Ehsan's own channel is the reference so forwarding restrictions
do not matter; one product per post, but possibly several photos; hosting must cost nothing
and be stable; the customer flow ends in a cart.

Answered at round 4: Ehsan curates his own channel; there is no forwarding from other
shops and no cross-shop price comparison.

Still open:
- Target launch date, and roughly how many customers will use it at first.
- How Ehsan actually writes captions — needed to tune price parsing and the freshness
  window. Answerable only by looking at real posts.
