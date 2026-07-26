# Design v3 — Ehsan's Shop Bot

Revised 2026-07-26 (round 3). Changes from v2: cart added at the owner's request, single
merged search entry point, media-group (multi-photo) support, supplier attribution demoted
from required to nice-to-have, and hosting settled on **Telegram Serverless** (official).

Scope rule: **the smallest thing that does the whole job.** Persian strings are the actual
product copy and are quoted verbatim.

## 1. Architecture — one bot, one channel, no server

```
supplier channels ──(Ehsan forwards)──▶  Ehsan's channel  ──▶  bot (admin)
                                          = the reference          │
                                                                   ▼
                                                     Telegram Serverless
                                                     (V8 sandbox + SQLite,
                                                      on Telegram's own infra)
```

Ehsan's channel **is** the reference. Whatever is in it can be quoted to customers; whatever
isn't, doesn't exist as far as the bot is concerned. Customers never see or join it.

The bot is admin there, so Telegram pushes every new post to it. Nothing polls, nothing idles.

## 2. What the bot stores per post

| Field | Source |
|---|---|
| product text (name + description) | post caption |
| photos | **`file_id` only** — one or many (§4). Telegram keeps the images; we store nothing |
| price | parsed from the caption (§6) |
| supplier | `forward_origin` when the post was forwarded — **optional**, see below |
| link to the post in Ehsan's channel | always |
| date | post date |

**Supplier attribution is best-effort, not required.** If Ehsan forwards, Telegram carries the
original channel name and the bot records it automatically. If he re-posts by hand (e.g. a
channel that blocks forwarding), there is no source name — and that is fine, because **every
order notification links to the post in Ehsan's channel**. He taps it and sees for himself
whose post it is. Nothing breaks. Per-supplier trust ranking is dropped from v1 as a result.

Newest post for a product supersedes older ones; posts past a set age are dropped, so the index
never serves ancient prices.

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

**The bot composes the card itself.** It never forwards and never copies the supplier's post.
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
- **The description is sanitized before display.** Supplier captions routinely carry their own
  `@username`, `t.me/…` link, and phone number — «برای سفارش تماس بگیرید». All stripped. This
  is what actually enforces the owner's rule that the customer never learns the supplier; with
  supplier photos and text now reaching customers, it is the load-bearing safeguard, not a
  polish step. **Text that cannot be confidently cleaned is dropped, not shown.**
- Prices render in one canonical form — Persian digits, thousands separators, «تومان» —
  whatever format the supplier used.
- Dates render relatively — «امروز» / «دیروز» / «۳ روز پیش» — never a raw timestamp.
- Description truncated to fit Telegram's caption limit.

## 5. Ehsan's notification

One message per order, covering every item in the cart:

```
🔔 سفارش جدید #۱۰۴۲
👤 مریم رضایی — ۰۹۱۲۳۴۵۶۷۸۹

۱. قالب کیک یزدی — ۱۲ عدد
   💰 ۱۸۵٫۰۰۰ ت — فروشگاه حامد (۲ روز پیش) ↗️ [پست]
   سایر: قنادی‌سرا ۱۹۰٫۰۰۰ · پخش رضا ۱۹۵٫۰۰۰

۲. کاغذ شیرینی — ۵ بسته
   💰 ۸۰٫۰۰۰ ت — پخش رضا (امروز) ↗️ [پست]

جمع تقریبی: ۲٫۶۲۰٫۰۰۰ تومان

📞 تماس با مشتری
✅ انجام شد        ❌ منتفی شد
```

- **Runner-ups are shown** because "cheapest" is not always best for Ehsan — that shop may be
  out of stock, slow, or pay a worse commission. The bot ranks; Ehsan decides.
- Every line links to the post so he verifies in one tap before phoning.
- **Exactly three states** — `جدید` → `در حال پیگیری` → `بسته‌شده` — one tap each. A richer
  status model is work Ehsan will not do.

## 6. Price parsing

Captions are free-form Persian. The parser handles Persian/Arabic digits, `۱۸۵٫۰۰۰` /
`۱۸۵,۰۰۰` / `۱۸۵ هزار` / `۱۸۵ت` / `۱۸۵ تومان`, and both تومان and ریال. Where a caption holds
several numbers (weight, diameter, count, price), the price is the one carrying a currency
marker. **Ambiguous cases resolve to "no price", never to a guess** — quoting a wrong price
costs far more than quoting none.

## 7. Product identity — the hard problem, at hundreds of items

Ehsan trades in **hundreds** of items, named differently by every shop. Two layers, and layer 1
works on day one with an empty catalogue:

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

Any of these — from a customer or from a post — resolves to the same product, so prices from
differently-worded shops line up into one comparable list.

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

A supplier-management section is **not** needed: Ehsan's channel is the reference, and
suppliers are recorded automatically where available.

## 9. Hosting — Telegram Serverless (official, no server, no cost)

The owner was right that Telegram added this; the earlier answer here was wrong.
**Telegram Serverless** runs bot backend code on Telegram's own infrastructure:

- JavaScript in an isolated **V8 sandbox**, running next to the Bot API
- a built-in **SQLite database** per bot, with a schema definition and query builder —
  products, aliases, posts, carts and orders all fit it directly
- deployed with one command (`npx tgcloud push`); migrations via `npx tgcloud migrate`
- no server, no container, no scaling, no third-party account, no credit card

Why it fits this project specifically:
- **No npm packages** (official SDK and own modules only) — not a problem here. Persian text
  normalization, price parsing and search are plain JavaScript with no dependencies.
- **File bytes can't be uploaded or downloaded from a handler** (documented as temporary) —
  also not a problem: the bot only ever passes `file_id` strings around and never touches
  image bytes. This design already avoided that path for cost reasons.

Honest gaps to close at build time: Telegram does not publish quotas or limits for it, and it
is new. Both need confirming against a real deployment before Ehsan depends on it. If a hard
limit turns up, the fallback stays Cloudflare Workers + D1 free tier — the same shape of
system, so migrating would be re-hosting, not a rewrite.

**Vercel was considered and rejected**: its free Hobby tier forbids commercial use, and it
ships no database, so it would need a second free service bolted on. More parts, more accounts,
and a licence problem for a business bot.

## 10. Explicitly out of scope for v1

Online payment · inventory · invoices & accounting · reading prices from images (descriptions
are text — nothing to OCR) · automatic profit calculation · multiple operators · supplier
ratings and trust ranking · delivery tracking · any web dashboard.

## 11. Known risks

| Risk | Handling in v1 |
|---|---|
| Supplier branding leaks to the customer via a caption | Bot composes its own card; captions sanitized of usernames/links/phones; uncleanable text dropped. §4 |
| Stale price quoted as current | Every card shows its date; prices past the freshness window show «نیاز به استعلام» instead of a firm quote. |
| Cart total read as a binding invoice | Labelled «جمع تقریبی» with the confirmation note, in both the cart and Ehsan's notification. |
| Ehsan stops forwarding and the index quietly ages | Daily message to Ehsan: «امروز N پست اضافه شد.» Zero is visible. |
| A wrong price reaches a customer | Ambiguous parses resolve to "no price"; Ehsan confirms by phone before anything binds. |
| Customer phone numbers leak | Stored minimally, in the bot's own database, never in this repo, no export feature built. |
| Telegram Serverless quotas unknown / platform is new | Confirm limits on a real deployment before launch; Cloudflare Workers + D1 kept as a same-shape fallback. |
