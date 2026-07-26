# Design v4 — Ehsan's Shop Bot

Revised 2026-07-26 (round 4), **built and verified end to end**. Changes from v3: the
reference channel is Ehsan's own curated catalogue rather than a pile of forwarded
supplier posts — so ranking is newest-wins, not cheapest, and price comparison across
shops is gone. Hosting is **Cloudflare Workers + D1** (Telegram Serverless turned out not
to be available for this account).

Scope rule: **the smallest thing that does the whole job.** Persian strings are the actual
product copy and are quoted verbatim.

## 1. Architecture — one bot, one channel, no server

```
Ehsan curates his channel  ──▶  bot (admin there)  ──▶  Cloudflare Worker
  one post = one product         reads every post        + D1 (SQLite)
  photos · name · price
```

Ehsan's channel **is** the catalogue. Whatever is in it can be quoted to customers;
whatever isn't, doesn't exist as far as the bot is concerned. Customers never see or
join it — they only ever talk to the bot.

The bot is admin there, so Telegram pushes every new post to it by webhook. Nothing polls
and nothing idles, which is what makes a free serverless tier a genuine fit rather than a
compromise.

## 2. What the bot stores per post

| Field | Source |
|---|---|
| product text (name + description) | post caption |
| photos | **`file_id` only** — one or many (§4). Telegram keeps the images; we store nothing |
| price | parsed from the caption (§6) |
| supplier | `forward_origin`, on the rare post Ehsan forwards rather than writes — optional |
| link to the post in Ehsan's channel | always |
| date | post date |

**Supplier attribution is incidental.** Ehsan writes his own posts, so usually there is no
source channel to record — and nothing depends on it, because **every order line links back
to the post in his channel**. He taps it and sees the product exactly as he published it.

**Newest post for a product supersedes older ones.** This is the rule that makes re-posting
the way to change a price: post it again and the bot quotes the new number, up or down.
Posts past a set age drop out of search entirely, so the index never serves stale prices.

## 3. Customer flow

Main menu — **one** way in, not two:

```
  ┌────────────────────────────────┐
  │ 🔍 استعلام کالا                 │
  │ 🛒 سبد خرید من (۲)              │
  │ 📋 سفارش‌های من                 │
  │ ☎️ ارتباط با ما                 │
  └────────────────────────────────┘
```

1. **استعلام کالا** → «نام کالایی که می‌خواهید را بنویسید:»
2. Customer types free text, e.g. `قالب کیک یزدی`
3. Bot resolves it and sends **the product card** (§4) with three buttons:

```
  ➕ افزودن به سبد خرید
  🔍 استعلام جنس جدید
  ↩️ بازگشت
```

   - Several different products match → up to 5 as buttons, «کدام مورد است؟»
   - Matched but no readable price → «موجودی و قیمت این کالا استعلام می‌شود»; it can still
     go in the cart. A quote-less lead is still a lead.
   - No match → «این کالا در لیست ما نبود؛ درخواست شما ثبت شد و همکاران ما بررسی می‌کنند.»
     Ehsan is notified anyway, and the phrase enters the learning queue (§7).
4. **افزودن به سبد خرید** → «چه تعداد؟» (a number, or ۱ / ۲ / ۵ / ۱۰ shortcuts) → added, and
   the same three buttons reappear so the customer keeps shopping without going back to menus.
5. **سبد خرید من**:

```
🛒 سبد خرید شما

۱. قالب کیک یزدی — ۱۲ عدد — ۲٫۲۲۰٫۰۰۰ ت
۲. کاغذ شیرینی — ۵ بسته — ۴۰۰٫۰۰۰ ت
────────────────
جمع تقریبی: ۲٫۶۲۰٫۰۰۰ تومان
(قیمت نهایی پس از تماس همکاران ما تأیید می‌شود)

✅ ثبت سفارش    🗑 حذف یک قلم    ➕ افزودن کالا
```

   The total is labelled **تقریبی** deliberately — Ehsan confirms every price by phone, and a
   total that looks binding creates an argument he has to fight later.
6. **ثبت سفارش** → **first order only:** name, then phone via Telegram's native *share contact*
   button — **one tap, no typing**. Saved; returning customers skip this entirely.
7. «✅ سفارش شما با شماره #۱۰۴۲ ثبت شد. همکاران ما به‌زودی برای تأیید نهایی تماس می‌گیرند.»

Note on wording: the owner suggested «موجودی ما» or «استعلام کالا» for the entry button.
Designed as «استعلام کالا» — Ehsan holds no stock, so «موجودی ما» promises an availability the
bot cannot actually guarantee. Easy to change if he prefers his own phrasing.

## 4. The product card — standardized, and multi-photo

**The bot composes the card itself.** It never forwards and never copies the original post.
Photos are sent by `file_id`, the text is ours, and the layout is identical every time:

```
        [ photo ]  [ photo ]  [ photo ]      ← album, when the post had several

🧁 قالب کیک یزدی

💰 قیمت: ۱۸۵٫۰۰۰ تومان
📅 به‌روزرسانی: امروز

ℹ️ جنس آلومینیوم — قطر ۸.۵ سانت

  ➕ افزودن به سبد خرید
  🔍 استعلام جنس جدید
  ↩️ بازگشت
```

**Multi-photo handling.** A post with several photos arrives as an *album* — several messages
sharing one `media_group_id`, with the caption on the first. The indexer groups them into one
product and keeps every `file_id`. On display, Telegram does not allow buttons on an album, so
the card is sent as two messages: the album first, then the text block with its buttons
directly beneath. In the chat it reads as one card.

Fixed rules that make it standard:

- **Always the same four blocks, always in this order:** name → price → date → description.
  A missing field is omitted; the order never changes.
- **The description is sanitized before display**, stripping `@username`, `t.me/…` links and
  phone numbers. Ehsan writes his own posts now, so this is a safety net rather than the front
  line — but it stays: the moment he pastes a caption from a supplier, it is the only thing
  stopping their contact details reaching his customer. **Text that cannot be confidently
  cleaned is dropped, not shown.**
- **A line that is only a price is dropped** from the description — the card already shows the
  price in its own block, and repeating it reads as a mistake.
- Prices render in one canonical form — Persian digits, thousands separators, «تومان» —
  whatever format the caption used. Digits in the description are rendered Persian too.
- Dates render relatively — «امروز» / «دیروز» / «۳ روز پیش» — never a raw timestamp.
- Description truncated to fit Telegram's caption limit.

## 5. Ehsan's notification

One message per order, covering every item in the cart:

```
🔔 سفارش جدید #۱۰۴۲
👤 مریم رضایی — 09123456789

۱. قالب کیک یزدی — ۱۲ عدد
   💰 ۱۹۵٫۰۰۰ ت (امروز)
۲. کاغذ شیرینی بسته ۵۰۰ عددی — ۵ عدد
   💰 ۸۰٫۰۰۰ ت (امروز)

جمع تقریبی: ۲٫۷۴۰٫۰۰۰ تومان

  ↗️ پست ۱   ↗️ پست ۲
  🔄 در حال پیگیری   ✅ انجام شد
  ❌ منتفی شد
```

- **The phone is rendered in Latin digits**, normalised to `09…`. Telegram only linkifies a
  number written that way, and tapping to call the customer is the entire next step.
- Every line links to its post so he verifies in one tap before phoning.
- **Exactly three states** — `جدید` → `در حال پیگیری` → `بسته‌شده` — one tap each. A richer
  status model is work Ehsan will not do.

## 6. Price parsing

Captions are free-form Persian. The parser handles Persian/Arabic digits, `۱۸۵٫۰۰۰` /
`۱۸۵,۰۰۰` / `۱۸۵ هزار` / `۱۸۵ت` / `۱۸۵ تومان`, and both تومان and ریال. Where a caption holds
several numbers (weight, diameter, count, price), the price is the one carrying a currency
marker. **Ambiguous cases resolve to "no price", never to a guess** — quoting a wrong price
costs far more than quoting none.

## 7. Product identity — the hard problem, at hundreds of items

Ehsan trades in **hundreds** of items, and customers ask for them by whatever name they know —
«کاسه ۸.۵» for what he posted as «قالب کیک یزدی». Two layers, and layer 1 works on day one
with an empty catalogue:

**Layer 1 — normalized text search (automatic).** Fold Arabic ↔ Persian characters (ي/ی، ك/ک),
fold Persian/Arabic digits, normalize ZWNJ and spacing, then match the customer's words against
indexed post text. Most searches are answered before Ehsan has defined anything.

**Layer 2 — Ehsan's alias table (grows from real traffic).** One product, many names:

```
قالب کیک یزدی
  ← کاسه ۸.۵
  ← قالب یزدی
  ← کاسه کیک یزدی
```

Any of these — from a customer or from a post — resolves to the same product, so a customer
finds the item under the name they use, and a re-post supersedes the previous price instead of
appearing as a second product.

**The critical choice:** Ehsan is *never* asked to enter hundreds of products up front. That
would guarantee the bot is never used. The table fills itself from real demand, one tap at a
time, via the queue below.

## 8. Ehsan's admin panel (his user id only)

```
➕ افزودن کالا / اسم‌های دیگر
📥 جستجوهای بی‌نتیجه        ← the learning loop
📊 سفارش‌ها
```

- **افزودن کالا** — product name, then aliases one per message. Optionally pin a photo.
- **جستجوهای بی‌نتیجه** — customer searches that found nothing or looked ambiguous. Each row
  shows the phrase actually typed, with buttons: attach as an alias of an existing product ·
  make it a new product · ignore. **One tap per row.** This is how a hundreds-item catalogue
  gets built — out of real demand, by the person who knows the trade, without ever feeling
  like data entry.
- **سفارش‌ها** — orders by status.

A supplier-management section is **not** needed: Ehsan's channel is the catalogue.

## 9. Hosting — Cloudflare Workers + D1

Telegram Serverless was the first choice and would have been the better fit, but it is
**not available for this account** — the owner checked BotFather and there is no such
entry, in the bot menu or in Bot Settings. Moved to the fallback identified in advance.

**Cloudflare Workers + D1**, free tier: 100,000 requests/day, no credit card, and no
prohibition on commercial use. Against a few hundred posts and orders a day this is
nowhere near a limit. Images cost nothing because only `file_id` is ever stored.

The port cost little because the business logic never depended on the platform: all of
`lib/` carried over unchanged apart from import paths, absorbed by two shims — a Drizzle
compatibility layer keeping the `table`/`boolean`/`json` helpers, and `db`/`api` as
per-request module bindings so no request context had to be threaded through the code.

Two platform rules the design must respect, both enforced in code:
- **Always answer HTTP 200**, even when handling fails. A non-200 makes Telegram retry the
  same update indefinitely — which would replay orders and re-notify Ehsan.
- The webhook must be registered with `allowed_updates` including `channel_post`, or the
  bot never receives a single product.

**Vercel was considered and rejected**: its free Hobby tier forbids commercial use, and it
ships no database, so it would need a second free service bolted on.

Honest caveat: a free tier carries no service guarantee and its limits can change, so a
paid tier (a few dollars a month) stays on the table for something a real business runs on.

## 10. Explicitly out of scope for v1

Online payment · inventory · invoices & accounting · reading prices from images (descriptions
are text — nothing to OCR) · automatic profit calculation · multiple operators · supplier
ratings and price comparison across shops · delivery tracking · any web dashboard.

Known gap, deliberately left: **editing a post in the channel does not update the index**
(`edited_channel_post` is not handled). Re-posting is the documented way to change a price,
and it is also what makes the newest-wins rule work. Worth adding if Ehsan turns out to edit
in place by habit.

## 11. Known risks

| Risk | Handling in v1 |
|---|---|
| Contact details leak to the customer via a pasted caption | Bot composes its own card; captions sanitized of usernames/links/phones; uncleanable text dropped. §4 |
| Stale price quoted as current | Every card shows its date; prices past the freshness window show «نیاز به استعلام» instead of a firm quote. |
| Cart total read as a binding invoice | Labelled «جمع تقریبی» with the confirmation note, in both the cart and Ehsan's notification. |
| Ehsan stops updating the channel and the index quietly ages | The admin panel always shows the active post count and the date of the newest post. |
| A wrong price reaches a customer | Ambiguous parses resolve to "no price"; Ehsan confirms by phone before anything binds. |
| Customer phone numbers leak | Stored minimally, in the bot's own database, never in this repo, no export feature built. |
| A price rise is quoted at the old lower price | Newest post wins, not cheapest. §1, §6 |
| Telegram retries a failed update forever, replaying orders | The Worker always answers 200 and logs the failure instead. §9 |
| Free-tier limits or policy change | Paid tier identified in advance; migration is a config change, not a rewrite. |
