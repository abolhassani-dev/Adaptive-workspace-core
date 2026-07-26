# Telegram Shop Bot — Ehsan (Confectionery Supplies Brokerage)

## Goal
Ehsan sells confectionery/pastry supplies (لوازم قنادی) as a **broker**: he does not hold
stock. Other shops publish daily product+price lists in their own Telegram channels; Ehsan
sells their goods to his own customers and earns his margin as commission on the supplier's
invoice.

Ehsan forwards those shops' posts into **his own Telegram channel**, where his bot is admin.
That channel is the reference: whatever is in it can be quoted to customers.

He wants a Telegram bot to hand to his customers that acts as his storefront:
1. Customer taps «استعلام کالا» and types a product name in their own words.
2. The bot searches the indexed posts, finds the product, and shows a standardized card —
   photo(s), cheapest fresh price, date, description — with the source hidden.
3. Customer adds items to a cart and submits a preliminary order (name, phone).
4. Ehsan gets one Telegram notification per order: which customer, what items and quantities,
   which supplier and price for each, plus the runner-ups, each linked to the original post.
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
- **Hosting at zero cost** — **resolved: Telegram Serverless**, official, runs bot code on
  Telegram's own infrastructure with a built-in SQLite database. No server, no third-party
  account, no credit card. Its two constraints (no npm packages; no file-byte upload/download)
  do not affect this design. Remaining unknown: Telegram publishes no quotas, so limits must be
  confirmed on a real deployment before launch. Fallback of the same shape: Cloudflare Workers
  + D1. See DECISIONS 2026-07-26 (correction).
- **Persian product-name matching** — no external tool needed. Normalization (Arabic/Persian
  character folding, digit folding, ZWNJ) + Ehsan-curated aliases + an unmatched-search
  learning queue. Built-in capability, no dependency.
- **Price parsing from free-form Persian captions** — no external tool needed; ambiguous cases
  must resolve to "no price" rather than a guess.

## Toolbox (this project)
- **Telegram Serverless** — host for the bot's code and database. Role: runs everything;
  removes the server, the hosting account and the cost entirely. Access: the bot's own token;
  no third-party account. Chosen because it is official, free, and its two constraints (no npm
  packages, no file-byte handling) do not touch this design. Quotas unpublished — confirm on a
  real deployment before launch. Fallback: Cloudflare Workers + D1.

## Open questions
Answered at intake round 2: channels are handled by Ehsan forwarding into his own channel;
posts are name + photo + text description; hundreds of products; the customer must never see
the supplier's name (confirmed); hosting must be zero-cost.

Answered at intake round 3: Ehsan's own channel is the reference so forwarding restrictions
do not matter; one product per post, but possibly several photos; hosting must cost nothing
and be stable; the customer flow ends in a cart.

Still open:
- Target launch date, and roughly how many customers will use it at first.
- Actual Telegram Serverless quotas — answerable only by deploying, not by asking.
