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
- **Software development** — bot + channel reader/indexer + storage; this is the deliverable
- **Integrations** — Telegram Bot API (storefront) + Telegram MTProto client (reading
  supplier channels). Two different access paths; see Capability gaps.
- **Data & analytics (product identity)** — the hard core of the project: the same physical
  item appears under many names across channels ("قالب کیک یزدی" = "کاسه ۸.۵" = …).
  Needs an alias/synonym layer that Ehsan grows himself over time.
- **Price parsing & freshness** — Persian numerals, mixed formats (۱۸۵٫۰۰۰ / ۱۸۵ هزار / ۱۸۵ت),
  and a stale price is worse than no price. Every quote must carry its post date.
- **UX for a non-technical operator** — Ehsan's admin panel lives in Telegram, is
  button-driven, and never asks him to type structured data or understand a concept.
- **Privacy** — the bot stores customers' real names and phone numbers. Minimum collection,
  no export, no sharing, and the supplier's identity is never shown to the customer.
- **Security & secrets** — bot token and the MTProto session file are credentials. Never in
  this repo; environment variables / server-side only.
- **Operations & maintenance** — must run 24/7 unattended; the owner (not Ehsan) runs it.
  A dead reader silently serves stale prices, so it needs a liveness signal.

### Optional
- **Business model support (markup)** — bot could add a % markup on top of the supplier
  price instead of quoting it raw. Propose only if Ehsan's commission model changes.
- **Multi-item orders** — one order containing several products. Cheap to add, genuinely
  useful for this trade; included as a v1.1 candidate, not a v1 blocker.

### Deferred
- **Image/OCR price extraction** — activates if a material share of supplier channels post
  their price lists as photos rather than text. Must be measured before building.
- **Reporting/accounting** — activates when Ehsan asks to track commissions and profit.
- **Multi-operator** — activates if Ehsan hires an assistant to handle orders.
- **Legal/regulatory** — activates only if the bot starts taking payments.

### Irrelevant for now
Payments, logistics/shipping, inventory management, web dashboard, invoicing.

## Capability gaps
- **Reading supplier channels** — *the* load-bearing constraint. A Telegram **bot** cannot
  read a channel it is not a member of, and Ehsan cannot add his bot to other shops'
  channels. Resolved direction: a separate **reader** logged in as a Telegram *user account*
  (MTProto) that joins the public supplier channels like any normal subscriber. Fallback if
  that is unacceptable: Ehsan forwards supplier posts into a private channel where his bot
  *is* admin (zero risk, but daily manual work). See DECISIONS 2026-07-26.
- **MTProto library choice** — open. Telethon was archived Feb 2026; Kurigram / Pyrofork are
  the maintained candidates. Decide at build time via `vet-tools`; see toolbox registry.
- **Persian product-name matching** — no external tool needed. Normalization (Arabic/Persian
  character folding, digit folding, ZWNJ) + Ehsan-curated aliases + an unmatched-search
  learning queue. Built-in capability, no dependency.

## Toolbox (this project)
*(empty — nothing adopted yet; library selection pending vetting at build time)*

## Open questions
- Are the supplier channels public (joinable by a normal account), and roughly how many?
- Do those channels post prices as **text/captions** or as **photos** of price lists?
  This decides whether v1 is feasible as designed or needs the deferred OCR dimension.
- Roughly how many distinct products does Ehsan actually trade in?
- Confirm: the customer must never see the supplier's name (protects Ehsan's position).
- Who pays for and owns the server, and is there a target launch date?
