# Design v1 — Ehsan's Shop Bot

Scope rule for this document: **the smallest thing that does the whole job**. Every feature
here exists because removing it breaks the broker workflow. Persian strings are the actual
product copy and are quoted verbatim.

## 1. Two moving parts

**A. The Reader (خواننده)** — a background service, invisible to everyone.
Logged in as a dedicated Telegram *user account* that has subscribed to the supplier
channels like a normal person. Every ~15 minutes it pulls new posts and stores each one as:
channel, message id + link, raw text, detected product lines, detected prices, post date.
It only reads. It never writes, never joins private groups, never touches member lists.

**B. The Shop Bot (بات فروشگاه)** — the normal Telegram bot everyone interacts with.
Same bot serves two audiences, split purely by Telegram user id: customers see the shop,
Ehsan additionally sees a "مدیریت" button. Nobody else can ever see it.

## 2. Customer flow

Target: an order placed in **3 taps and 2 short answers**.

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
3. Bot resolves the text to a product (see §4) and replies with the best fresh price:

```
قالب کیک یزدی
💰 قیمت: ۱۸۵٫۰۰۰ تومان
🗓 آخرین به‌روزرسانی قیمت: امروز

✅ همین را می‌خواهم        🔍 جستجوی دیگر
```

   - **The supplier's name is never shown to the customer.** That is Ehsan's whole business.
   - If several *different* products match → up to 5 as buttons, «کدام مورد است؟»
   - If a match exists but no price could be read → «موجودی و قیمت این کالا استعلام می‌شود»
     and the order still proceeds. A quote-less lead is still a lead.
   - If nothing matches → «این کالا در لیست ما نبود؛ درخواست شما ثبت شد و همکاران ما
     بررسی می‌کنند.» Ehsan is notified anyway, and the phrase enters the learning queue (§5).

4. **چه تعداد؟** → customer types a number (or taps ۱ / ۲ / ۵ / ۱۰ shortcuts).
5. **First order only:** name + phone.
   - «نام و نام خانوادگی شما؟» → free text
   - Phone via Telegram's native *share contact* button → **one tap, no typing**.
   - Both are saved; returning customers skip this step entirely.
6. Confirmation:

```
✅ سفارش شما با شماره #۱۰۴۲ ثبت شد.
همکاران ما به‌زودی برای تأیید نهایی با شما تماس می‌گیرند.
```

**v1.1 candidate:** a «➕ کالای دیگر» button before confirmation, so one order can carry
several items. Cheap to add and this trade needs it — flagged, not built in v1.

## 3. Ehsan's notification

Sent to Ehsan as a private message the moment an order is submitted:

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

Design points that matter here:
- **Runner-up suppliers are shown**, because "cheapest" is not always "best for Ehsan" — the
  cheapest shop may be out of stock, slow, or pay a worse commission. Ehsan decides; the bot
  only ranks.
- **Every price carries its post date**, and a direct link to the original post so Ehsan can
  verify with one tap before phoning.
- **Order status is exactly three states** — `جدید` → `در حال پیگیری` → `بسته‌شده` — each one
  tap. Any richer status model is work Ehsan will not do.

## 4. Product identity — the actual hard problem

The same physical item is named differently in every channel. Two layers solve it, and
crucially **layer 1 works on day one with zero setup**:

**Layer 1 — normalized text search (automatic).** Fold Arabic ↔ Persian characters
(ي/ی, ك/ک), fold Persian/Arabic digits to Latin, normalize ZWNJ and spacing, then match the
customer's words against indexed post text. This alone answers most searches immediately,
before Ehsan has defined anything.

**Layer 2 — Ehsan's alias table (grows over time).** A product is one entry with many names:

```
قالب کیک یزدی
  ← کاسه ۸.۵
  ← قالب یزدی
  ← کاسه کیک یزدی
```

Any of these, from a customer or from a channel post, resolves to the same product — so
prices from 8 differently-worded channels line up into one comparable list.

**The critical design choice:** Ehsan is *never* asked to sit down and enter a catalogue.
The alias table fills itself from real traffic via the learning queue below. This is what
keeps the project usable by someone with no computer skills.

## 5. Ehsan's admin panel (his user id only)

```
➕ افزودن کالا / اسم‌های دیگر
🔗 کانال‌های مرجع
📥 جستجوهای بی‌نتیجه        ← the learning loop
📊 سفارش‌ها
```

- **افزودن کالا** — product name, then aliases one per message. Nothing else.
- **کانال‌های مرجع** — paste a channel link to add, tap to remove, and set priority
  ۱/۲/۳ (a trusted supplier wins over a slightly cheaper unknown one).
- **جستجوهای بی‌نتیجه** — the queue of customer searches that found nothing or looked
  ambiguous. Each row: the phrase a customer actually typed, with buttons to attach it as an
  alias of an existing product, make it a new product, or ignore it. **One tap per row.**
  This is how the catalogue gets built — out of real demand, by the person who knows the
  trade, without ever feeling like data entry.
- **سفارش‌ها** — the order list by status.

## 6. Explicitly out of scope for v1

Online payment · cart/checkout · inventory · invoices & accounting · OCR of price-list
images · automatic profit calculation · multiple operators · supplier ratings · delivery
tracking · any web dashboard. Each is a real feature; none is needed to prove the loop
"customer asks → bot quotes → Ehsan closes" works.

## 7. Known risks

| Risk | Handling in v1 |
|---|---|
| Prices posted as images, not text | Measured before building (open question). If common, OCR moves from deferred to essential and v1 grows. |
| Stale price quoted as current | Every quote shows its post date; prices older than a configurable window are labelled «نیاز به استعلام» rather than quoted as firm. |
| Reader service dies unnoticed | Daily liveness message to Ehsan/owner: «امروز N پست از M کانال خوانده شد.» Silence is the alarm. |
| Reader account gets limited | Read-only, low request rate, no member scraping — the low-risk usage profile. Use a dedicated number, not Ehsan's personal account. |
| Customer discovers the supplier and buys direct | Supplier identity never leaves the admin side. |
| Customer phone numbers leak | Stored minimally, server-side only, never in this repo, no export feature built. |
