# State — Telegram Shop Bot (Ehsan)
Updated: 2026-07-26

## Phase
**v1 built and verified end to end, not yet deployed.** Runs on Cloudflare Workers + D1.
Deployment needs a Cloudflare account and the bot token, both of which are the owner's
step — `bot/README.md` is the Persian walkthrough.

## Done
- Intake rounds 1–4; design at v4 (`DESIGN.md`), all decisions in `DECISIONS.md`
- **Round 4 correction (important):** Ehsan curates his *own* channel as his catalogue —
  no forwarding from supplier channels, no cross-shop price comparison. Consequence:
  ranking changed from *cheapest* to **newest post wins**, because a re-post is how he
  changes a price, and cheapest-wins would have quoted his old price back after every
  raise. Runner-up suppliers block removed.
- **Telegram Serverless is unavailable for this account** (owner checked BotFather;
  no such entry). Ported to **Cloudflare Workers + D1** — free, no card, commercial use
  allowed. Business logic carried over unchanged behind two small shims.
- **Verified by actually running it**, not just reading it:
  - Worker builds (47 KiB gzipped) and runs locally against a real D1
  - channel posts indexed, including albums folded into one product
  - prices parsed; supplier contact details stripped from descriptions
  - search → product card → cart → checkout → Ehsan's notification, all confirmed
  - the alias learning loop: an unknown name is captured, taught in one step, and the
    same search then returns the right product
- **Bugs found and fixed by that testing** (each would have shipped silently):
  1. Persian `\b` in the price regex — *no price ever parsed*
  2. digits rendered as `185٫000` — Latin digits beside a Persian separator
  3. the price repeated inside the product description
  4. phone shown in Persian digits — not tappable, and calling is the whole job
  5. «۰ پست وصل شد» after teaching an alias — read as failure when it had worked

## Next
1. Owner: create a free Cloudflare account, then follow `bot/README.md` steps 1–8
2. **Revoke the exposed bot token first** (BotFather → API Token → Revoke) — it appeared
   in a screenshot; use the new one when setting `BOT_TOKEN`
3. `/setadmin` immediately after deploy, before the bot reaches any customer
4. Ehsan posts ~10 real products, then check the cards read correctly and prices parse
5. Tune `FRESHNESS_DAYS` and the ambiguity rule once real captions are visible

## Blockers / waiting on
- Cloudflare account + deployment (owner's step)
- Real product posts needed before price parsing can be tuned. Captions carrying two
  prices deliberately parse to "no price", so if Ehsan writes «تکی / عمده» routinely,
  that rule is the first thing to revisit.

## Known gaps (deliberate)
- Editing a channel post does not update the index (`edited_channel_post` unhandled);
  re-posting is the documented way to change a price
- Multi-item orders work, but there is no way for a customer to change a quantity after
  adding — only remove the line and add it again
