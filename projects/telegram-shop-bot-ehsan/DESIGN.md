# Design v2 — Ehsan's Shop Bot

Revised 2026-07-26 after the owner's answers. **v2 is materially simpler than v1**: the
separate MTProto reader is gone. Ehsan forwards supplier posts into his own channel where the
bot is admin, so everything runs on the plain Bot API.

Scope rule: **the smallest thing that does the whole job.** Persian strings are the actual
product copy and are quoted verbatim.

## 1. Architecture — one bot, one channel

```
supplier channels ──(Ehsan forwards, manually)──▶  Ehsan's own channel
                                                    (bot is admin here)
                                                          │
                                                    bot reads every post
                                                          │
                                                    ┌─────▼─────┐
                                                    │  index    │  product text · price
                                                    │           │  photo id · source · date
                                                    └─────┬─────┘
                                                          │
                                        customer searches ─┴─ Ehsan's admin panel
```

Ehsan's channel is a **database, not a storefront** — customers never see it, never join it.
It exists so the bot has something it is legally and technically allowed to read.

**A free consequence worth knowing:** a forwarded post carries `forward_origin`, which names
the original channel. So the bot learns *which supplier* each product/price came from
**automatically**. Ehsan forwards and does nothing else — no tagging, no typing, no channel
registration. Confirmed against the Bot API docs.

Caveat: if a supplier channel has "restrict saving content" turned on, its posts cannot be
forwarded at all. Those suppliers have to be handled outside the bot. Needs checking per
channel.

## 2. What the bot stores per post

| Field | Source |
|---|---|
| product text (name + description) | post caption |
| photo | **`file_id` only** — Telegram keeps the image; we never store or pay for image storage |
| price | parsed from the caption (§5) |
| supplier | `forward_origin` — automatic |
| date | post date |

Newest post for a given (supplier, product) supersedes the older one. Posts older than a set
window are dropped, so the index stays small and never serves ancient prices.

v1 assumes **one product per post**, as described by the owner. If some suppliers post
multi-item price lists, those posts still get text-searched, and anything missed lands in the
unmatched-search queue (§6) — it degrades gracefully instead of breaking.

## 3. Customer flow

Target: an order in **3 taps and 2 short answers**.

```
/start
  ┌────────────────────────────────┐
  │ 🛒 ثبت سفارش                    │
  │ 📋 سفارش‌های من                 │
  │ ☎️ ارتباط با ما                 │
  └────────────────────────────────┘
```

1. **ثبت سفارش** → «نام کالایی که می‌خواهید را بنویسید:»
2. Customer types free text, e.g. `قالب کیک یزدی`
3. Bot resolves it to a product and sends **the standardized product card** (§4).
   - Several different products match → up to 5 as buttons, «کدام مورد است؟»
   - Matched but no readable price → «موجودی و قیمت این کالا استعلام می‌شود»; the order still
     proceeds. A quote-less lead is still a lead.
   - No match → «این کالا در لیست ما نبود؛ درخواست شما ثبت شد و همکاران ما بررسی می‌کنند.»
     Ehsan is notified anyway, and the phrase enters the learning queue.
4. **چه تعداد؟** → a number, or ۱ / ۲ / ۵ / ۱۰ shortcut buttons.
5. **First order only:** name, then phone via Telegram's native *share contact* button —
   **one tap, no typing**. Saved; returning customers skip this entirely.
6. «✅ سفارش شما با شماره #۱۰۴۲ ثبت شد. همکاران ما به‌زودی برای تأیید نهایی تماس می‌گیرند.»

**v1.1 candidate:** a «➕ کالای دیگر» button before confirmation, so one order carries several
items. This trade needs it and it is cheap — flagged, not built in v1.

## 4. The standardized product card

The owner asked for this to be designed and standardized. **The bot composes the card itself**
— it does not forward and does not copy the supplier's post. It sends the photo by `file_id`
with its own caption, in one fixed layout every time:

```
        [ photo ]

🧁 قالب کیک یزدی

💰 قیمت: ۱۸۵٫۰۰۰ تومان
📅 به‌روزرسانی: امروز

ℹ️ جنس آلومینیوم — قطر ۸.۵ سانت

  ✅ ثبت سفارش        🔍 جستجوی دیگر
```

Fixed rules that make it standard:

- **Always the same four blocks, always in this order:** name → price → date → description.
  A missing field is omitted; the order never changes.
- **The description is sanitized before display.** The supplier's original caption typically
  carries their own branding — `@username`, `t.me/…` links, phone numbers, «برای سفارش تماس
  بگیرید». All of that is stripped. This is not cosmetic: the owner confirmed the customer
  must never learn the supplier's identity, and now that supplier photos and text reach the
  customer, sanitizing is the only thing enforcing that rule. **Any text the bot cannot
  confidently clean is dropped rather than shown.**
- Prices are rendered in one canonical form — Persian digits, thousands separators, «تومان».
  Whatever format the supplier used is normalized away.
- Dates are rendered relatively — «امروز» / «دیروز» / «۳ روز پیش» — never a raw timestamp.
- Description is truncated to fit Telegram's 1024-character caption limit.
- **Which photo?** The photo attached to the offer being quoted (i.e. the cheapest fresh one).
  Ehsan can pin a preferred photo per product from the admin panel if a supplier's photo is
  poor. Default needs no action from him.

## 5. Price parsing

Supplier captions are free-form Persian. The parser must handle Persian/Arabic digits,
`۱۸۵٫۰۰۰` / `۱۸۵,۰۰۰` / `۱۸۵ هزار` / `۱۸۵ت` / `۱۸۵ تومان`, and both تومان and ریال. Where a
caption has several numbers (weight, diameter, count, price), the price is the one carrying a
currency marker; ambiguous cases resolve to "no price" rather than to a guess — quoting a
wrong price is far more damaging than quoting none.

## 6. Product identity — the hard problem, now at hundreds of items

Ehsan trades in **hundreds** of distinct items, each appearing under different names in
different channels. Two layers, and layer 1 works on day one with an empty catalogue:

**Layer 1 — normalized text search (automatic).** Fold Arabic ↔ Persian characters (ي/ی، ك/ک),
fold Persian/Arabic digits, normalize ZWNJ and spacing, then match the customer's words
against indexed post text. Most searches are answered before Ehsan has defined anything.

**Layer 2 — Ehsan's alias table (grows from real traffic).** One product, many names:

```
قالب کیک یزدی
  ← کاسه ۸.۵
  ← قالب یزدی
  ← کاسه کیک یزدی
```

Any of these — from a customer or from a channel post — resolves to the same product, so
prices from 8 differently-worded channels line up into one comparable list.

**The critical choice:** Ehsan is *never* asked to sit down and enter hundreds of products.
With hundreds of items that would guarantee the project dies unused. The table fills itself
from real demand through the queue below, one tap at a time.

## 7. Ehsan's notification

```
🔔 سفارش جدید #۱۰۴۲

👤 مریم رضایی — ۰۹۱۲۳۴۵۶۷۸۹
📦 قالب کیک یزدی — ۱۲ عدد

🏪 ارزان‌ترین مرجع: فروشگاه حامد
💰 ۱۸۵٫۰۰۰ تومان — پست ۲ روز پیش  ↗️ [مشاهده پست]

سایر مراجع:
· قنادی‌سرا — ۱۹۰٫۰۰۰ ت (امروز)
· پخش رضا — ۱۹۵٫۰۰۰ ت (۵ روز پیش)

📞 تماس با مشتری
✅ انجام شد        ❌ منتفی شد
```

- **Runner-ups are shown** because "cheapest" is not always best for Ehsan — that shop may be
  out of stock, slow, or pay a worse commission. The bot ranks; Ehsan decides.
- Every price carries its date and a link to the original post, so Ehsan verifies in one tap
  before phoning.
- **Exactly three states** — `جدید` → `در حال پیگیری` → `بسته‌شده` — one tap each. A richer
  status model is work Ehsan will not do.

## 8. Ehsan's admin panel (his user id only)

```
➕ افزودن کالا / اسم‌های دیگر
🏪 مراجع (فروشگاه‌ها)
📥 جستجوهای بی‌نتیجه        ← the learning loop
📊 سفارش‌ها
```

- **افزودن کالا** — product name, then aliases one per message. Optionally pin a photo.
- **مراجع** — suppliers appear here **automatically** as Ehsan forwards from them (no link
  pasting, no setup). He only sets trust priority ۱/۲/۳, so a reliable supplier can outrank a
  marginally cheaper unknown one.
- **جستجوهای بی‌نتیجه** — the queue of customer searches that found nothing or looked
  ambiguous. Each row shows the phrase a customer actually typed, with buttons: attach as an
  alias of an existing product · make it a new product · ignore. **One tap per row.** This is
  how a hundreds-item catalogue gets built — out of real demand, by the person who knows the
  trade, without ever feeling like data entry.
- **سفارش‌ها** — orders by status.

## 9. Hosting — zero cost, and no server to run

The owner asked for no server cost, believing Telegram now hosts bots. **It does not** — see
DECISIONS 2026-07-26 for what that new Telegram feature actually is. But zero cost is still
achievable, because this bot needs **no always-on process**:

The bot is admin in the channel, so Telegram *pushes* every new post to it as a webhook call.
Nothing polls, nothing idles. Work happens only when a post is forwarded or a customer types.

Direction: **Cloudflare Workers + D1** on the free tier — 100,000 requests/day and no credit
card required, against a workload of a few hundred posts and orders per day. Images cost
nothing because only `file_id` is stored, never the image. Final selection goes through
`vet-tools` at build time.

Honest caveats: a free tier carries no service guarantee and its limits can change, so a
paid-tier fallback (a few dollars a month) should stay on the table for a bot a real business
depends on. If the owner already runs an n8n instance, that is another host worth pricing —
though hundreds of products with an alias table is a poor fit for a flow builder.

## 10. Explicitly out of scope for v1

Online payment · cart/checkout · inventory · invoices & accounting · reading prices from
images (not needed — descriptions are text) · automatic profit calculation · multiple
operators · supplier ratings · delivery tracking · any web dashboard.

## 11. Known risks

| Risk | Handling in v1 |
|---|---|
| Supplier branding leaks to the customer through a photo caption | Bot composes its own card; captions sanitized of usernames/links/phones; uncleanable text dropped, not shown. §4 |
| Supplier channel blocks forwarding ("restrict saving") | Detected per channel; those suppliers stay outside the bot. Needs a check before build. |
| Stale price quoted as current | Every card shows its date; prices past the freshness window show «نیاز به استعلام» instead of a firm quote. |
| Ehsan stops forwarding and the index quietly ages | Daily message to Ehsan: «امروز N پست از M مرجع اضافه شد.» Zero is visible. |
| A wrong price reaches a customer | Ambiguous parses resolve to "no price"; Ehsan confirms by phone before anything is binding. |
| Customer phone numbers leak | Stored minimally, server-side only, never in this repo, no export feature built. |
| Free-tier limits or policy change | Paid fallback identified in advance; migration is a config change, not a rewrite. |
