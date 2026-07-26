# State — Telegram Shop Bot (Ehsan)
Updated: 2026-07-26

## Phase
**LIVE.** Deployed on Cloudflare Workers + D1 and responding in Telegram.
Worker: `https://ehsan-shop-bot.aratekpal.workers.dev`
Next real step is trying it with actual products in the channel, then handing it to a few
customers.

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

## Deployment (done 2026-07-26)
- Cloudflare account created; D1 database `ehsan-shop-bot` created and migrated by pasting
  the SQL from `bot/migrations/0001_init.sql` into the D1 console (no terminal involved —
  the owner cannot use one, so the whole deploy was done through the browser)
- Worker connected to this repo via Workers Builds, deploying from branch
  `claude/telegram-shop-bot-ehsan-myvful`
- `BOT_TOKEN` and `WEBHOOK_SECRET` set as Worker secrets (runtime, not build variables)
- Webhook registered with `allowed_updates=[message, callback_query, channel_post]`
- Bot confirmed responding in Telegram

### What cost the most time, so it isn't repeated
1. **Workers Builds "Retry build" replays the previous build's branch**, ignoring changed
   settings — corrections appeared to do nothing. Only a fresh push produces a build with
   the new configuration.
2. The root-directory field is labelled **"Path"** at creation time (under Advanced
   settings) and "Root directory" afterwards. It was resolved for good by adding a
   wrangler config at the **repository root**, so the setting no longer matters.
3. Settings has **two** sections called "Variables and secrets" — one inside the Build box
   (build-time only) and one at the top (runtime). Only the top one reaches the bot.
4. `BotApiError: sendMessage: Not Found` means **the bot token is wrong or missing** —
   not a routing problem. Check `getMe` with the token first to isolate it.

## Next
1. Ehsan posts ~10 real products in the channel, then check: do the cards read correctly,
   do prices parse, is anything showing «نیاز به استعلام» that shouldn't?
2. Tune `FRESHNESS_DAYS` and the price-ambiguity rule once real captions are visible
3. **Rotate the bot token and webhook secret** — both appeared in shared screenshots
4. Then hand the bot to a few real customers

## Blockers / waiting on
- Real product posts, before price parsing can be tuned. Captions carrying two prices
  deliberately parse to "no price", so if Ehsan writes «تکی / عمده» routinely, that rule
  is the first thing to revisit.
- Token and webhook secret rotation — exposed in screenshots during setup.

## Known gaps (deliberate)
- Editing a channel post does not update the index (`edited_channel_post` unhandled);
  re-posting is the documented way to change a price
- Multi-item orders work, but there is no way for a customer to change a quantity after
  adding — only remove the line and add it again
