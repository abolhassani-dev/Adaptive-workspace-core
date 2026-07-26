# State — Telegram Shop Bot (Ehsan)
Updated: 2026-07-26

## Phase
**v1 built, not yet deployed.** Design closed after three intake rounds; code written
against Telegram Serverless and living in `bot/`.

Deployment is the owner's step — it needs the CLI access token from BotFather, which must
never come through this repository or the chat.

## Done
- Intake rounds 1–3 and the v3 design (`DESIGN.md`), all decisions in `DECISIONS.md`
- Owner created the bot and made it admin in Ehsan's reference channel
- **v1 implemented** — 15 modules under `bot/`:
  - `handlers/channel_post.js` — indexes every forwarded post, folds albums (several
    photos, one product) into one row, ages out old posts
  - `handlers/message.js` — customer flow, checkout, admin text steps; any plain message
    is treated as a search
  - `handlers/callback_query.js` — all buttons, including Ehsan's order status taps
  - `lib/` — Persian normalization + supplier-branding sanitization, price parsing,
    search with alias widening, cart/order/notification, admin panel
- **Tested what can be tested without deploying**: all 15 files parse, and the pure logic
  (normalization, price parsing, sanitization) passes 31 direct assertions
- **Found and fixed a bug that would have shipped silently**: `\b` never matches after a
  Persian letter in JavaScript, so no price parsed at all. See DECISIONS.
- `bot/README.md` — setup and daily-use guide in Persian for the owner and Ehsan
- `bot/AGENTS.md` — invariants and Persian-text gotchas for whoever edits this next

## Next
1. Owner deploys: `npx tgcloud login` → `push` → `migrate` → `webhook sync` (README has it)
2. **Then `/setadmin` immediately**, before the bot is shared — first sender claims admin
3. Forward a handful of real supplier posts and check: does the card show the right photo,
   price and date, and is every trace of the supplier gone from the description?
4. **Confirm Telegram Serverless quotas on the real deployment** — still unpublished, and
   this is the last open risk before Ehsan depends on it
5. Only after that, hand the bot to a few real customers

## Blockers / waiting on
- Deployment and `/setadmin` — owner's step, needs the BotFather CLI token
- Telegram Serverless quotas remain unknown until deployed
- Real supplier posts needed to tune price parsing; ambiguous captions deliberately parse
  to "no price", so if real posts commonly carry two prices, `FRESHNESS_DAYS` and the
  ambiguity rule are the first things to revisit
