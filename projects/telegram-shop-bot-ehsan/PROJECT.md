# Telegram Shop Bot — Ehsan (Confectionery Supplies Brokerage)

## Goal
Ehsan sells confectionery/pastry supplies (لوازم قنادی) as a **broker**: he does not hold
stock. Other shops publish daily product+price lists in their own Telegram channels; Ehsan
sells their goods to his own customers and earns his margin as commission on the supplier's
invoice.

He wants a Telegram bot to hand to his customers that acts as his storefront:
1. Customer taps "ثبت سفارش" and types a product name in their own words.
2. The bot searches the indexed posts of reference supplier channels, finds which suppliers
   carry that product and at what price, and quotes the customer the cheapest fresh price.
3. Customer submits a preliminary order (product, quantity, name, phone).
4. Ehsan gets a Telegram notification: which customer, what product, what quantity, which
   supplier, what price — plus the runner-up suppliers.
5. Ehsan then phones the supplier to confirm stock/price, then phones his customer and
   closes the deal manually. **The bot stops at lead generation** — no payment, no logistics.

Success = Ehsan operates the whole thing from inside Telegram alone, with no computer
skills, and stops losing orders to manual back-and-forth. Concretely: his customers can
self-serve a price and place an order; Ehsan defines products and reference channels himself
without asking anyone for help.

## Nature
**Software project** (Telegram bot + channel indexer), with a real product/UX dimension
because the operator is non-technical. Not a content or marketing project.

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
- **Cost** — must be zero or near-zero. Achievable: the bot is webhook-driven with no
  always-on process, and images are never stored (only Telegram `file_id`).

### Optional
- **Business model support (markup)** — bot could add a % markup on top of the supplier
  price instead of quoting it raw. Propose only if Ehsan's commission model changes.
- **Multi-item orders** — one order containing several products. Cheap to add, genuinely
  useful for this trade; included as a v1.1 candidate, not a v1 blocker.

### Deferred
- **Multi-item orders** — one order carrying several products. Cheap and this trade needs it;
  v1.1 candidate, deliberately not a v1 blocker.
- **Reporting/accounting** — activates when Ehsan asks to track commissions and profit.
- **Multi-operator** — activates if Ehsan hires an assistant to handle orders.
- **Handing the bot to other shopkeepers** — would activate Telegram's Managed Bots
  (Bot API 9.6); noted so it isn't rediscovered later.
- **Legal/regulatory** — activates only if the bot starts taking payments.

### Irrelevant
Payments, logistics/shipping, inventory management, web dashboard, invoicing.
**Image/OCR price extraction** — ruled out, not deferred: supplier posts carry name, photo and
description as *text*, so there is nothing to OCR.

## Capability gaps
- **Reading supplier channels** — **resolved, no gap.** A bot cannot read channels it isn't in,
  but Ehsan already forwards supplier posts into his own channel where the bot is admin. Plain
  Bot API suffices; `forward_origin` even identifies the source supplier automatically. The
  MTProto reader, its dedicated phone number and its account risk are all gone.
  See DECISIONS 2026-07-26.
- **Hosting at zero cost** — direction set, not yet vetted. The bot needs no always-on process
  (webhook-driven), so a serverless free tier fits: Cloudflare Workers + D1 is the candidate.
  Confirm via `vet-tools` at build time. Note: Telegram does **not** host bot code.
- **Persian product-name matching** — no external tool needed. Normalization (Arabic/Persian
  character folding, digit folding, ZWNJ) + Ehsan-curated aliases + an unmatched-search
  learning queue. Built-in capability, no dependency.
- **Price parsing from free-form Persian captions** — no external tool needed; ambiguous cases
  must resolve to "no price" rather than a guess.

## Toolbox (this project)
*(empty — nothing adopted yet; hosting selection pending vetting at build time)*

## Open questions
Answered at intake round 2: channels are handled by Ehsan forwarding into his own channel;
posts are name + photo + text description; hundreds of products; the customer must never see
the supplier's name (confirmed); hosting must be zero-cost.

Still open:
- Do any supplier channels have **"restrict saving content"** enabled? Those posts cannot be
  forwarded at all, so those suppliers fall outside the bot. Needs a per-channel check.
- Does any supplier post **multi-item price lists** in one post, rather than one product per
  post? v1 assumes one product per post and degrades gracefully, but volume matters.
- Target launch date, and roughly how many customers will use it at first.
