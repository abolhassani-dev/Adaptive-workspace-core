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

## Live findings
- **Fixed (2026-07-26):** re-posting a product under a second name showed the *first* post's
  photo and description. A priced older post outranked a newer post whose price could not be
  parsed — and captions with two prices («تکی»/«عمده») parse to no price by design, so this
  triggered on an ordinary caption. Ranking is now newest-only. See DECISIONS.
- **Resolved (2026-07-26):** the two-prices question is answered by a posting template
  (`bot/POSTING-GUIDE.md` — name / price / description, one per line) plus a rule change:
  the **first price written wins**, replacing "ambiguous means null". Hand the guide to Ehsan;
  everything else follows from it.

## Added after launch (2026-07-26)
- **Five-field posting template** (`bot/POSTING-GUIDE.md`): name / price / material /
  units-per-pack / description. Material and pack are now their own columns and their own
  labelled rows on the card. Position decides the field, with a label overriding position and
  a lone dash skipping one.
- **Phone required at the door.** Nothing is shown until a visitor shares their number;
  `/start`, `/id`, `/setadmin` and the contact message are outside the gate, and the admin is
  exempt.
- **One message per customer, rewritten in place**, so the chat stops filling up. Telegram
  cannot edit text into a photo (change of kind = delete + resend), edits carry inline
  keyboards only (the bottom menu is sent once), and a bot cannot delete the customer's own
  messages in a private chat — only the bot's side collapses. Multi-photo posts now show the
  first photo with a «عکس‌های بیشتر» button instead of an album.
- **📈 گزارش مشتری‌ها**: active customers, new ones, searches with found/not-found, orders,
  the last twelve searches with names, and a per-customer list. Rolling 24h / 7d / 30d windows.

⚠️ **Migrations 0002, 0003 and 0004 must be pasted into the D1 console** — the remote database
is migrated by hand, so a deploy alone will not create the new columns and tables.

## Next
**Waiting on Ehsan.** He is using the bot for a few days and will report back; edits are
batched until then rather than changed under him mid-use.

`BACKLOG.md` holds the proposed edit list, written before his feedback so the two can be
compared. In priority order from that list:
1. **Rotate the bot token and webhook secret** (A1) — both appeared in screenshots, and this
   must happen before real customers, not after
2. **Tell the customer when their order status changes** (A3) — the bot currently captures the
   lead and then goes silent, which is the biggest hole in the flow
3. **Per-customer rate limit** (A2) — the URL is public and the free tier has a daily ceiling
4. **Looser fallback match before saying "not found"** (C1) — a not-found is a lost customer,
   and search currently demands every typed word
5. Then whatever Ehsan's feedback agrees with, first

## Blockers / waiting on
- Real product posts, before price parsing can be tuned. Captions carrying two prices
  deliberately parse to "no price", so if Ehsan writes «تکی / عمده» routinely, that rule
  is the first thing to revisit.
- Token and webhook secret rotation — exposed in screenshots during setup.

## Live findings, round 2 (2026-07-26)
- **Not a bug, a platform limit:** deleting a channel post leaves it in the index. Telegram
  sends bots nothing when a post is deleted — only new posts arrive — so the bot has no way
  to notice. Answered with a **🧹 پاک‌سازی حافظه** section in the panel: clear the products,
  or a full reset for testing (which keeps the admin). Reported by the owner after emptying
  the channel and still seeing "۳ پست فعال".
- **🗑 حذف یک محصول** added: Ehsan types a name and every post of that product leaves the
  index. It deletes the whole offer group, not the tapped post — a product re-posted three
  times has three rows, and removing only the newest would resurrect the previous price.

## Live findings, round 3 (2026-07-26)
- **The single-screen change broke typed input.** Editing one message is right for button taps
  and wrong after the user types: their message is last, so the edit happens above it and looks
  like nothing happened. Now `message` updates send a fresh screen at the bottom and
  `callback_query` updates edit in place (`setScreenMode` in `src/lib/screen.js`).
- **Alias flow rebuilt.** It used to always create a new product (duplicating an item and
  splitting its posts) and ended with typing `/done`. Now it matches existing products first,
  shows the running list of names with the attached post count, and finishes with a button.

## Live findings, round 4 (2026-07-26) — from Ehsan's first real caption
- **«قیمت ۷۰۰۰» parsed as no price.** A currency marker was required; real captions omit it.
  A label or the price position now vouches for a bare number.
- **Material was overwritten by the pack line.** A label-filled field did not advance the
  positional pointer, so the next unlabelled line landed on top of it. Also «در هر بسته …» is
  now recognised as the pack label.
- **The card showed the wrong product name.** A product entry's canonical name was overriding
  the post's own title, so a post reading «قالب کنگره ۸/۵» displayed as «قالب کیک یزدی».
  The post title now wins; the product entry is only for grouping, aliases and a pinned photo.

## Known gaps (deliberate)
- Editing a channel post does not update the index (`edited_channel_post` unhandled);
  re-posting is the documented way to change a price, and is written into POSTING-GUIDE.md
- Multi-item orders work, but there is no way for a customer to change a quantity after
  adding — only remove the line and add it again
- Removing a product removes it from the bot's memory only; the channel post itself stays
  and must be deleted separately if wanted.
