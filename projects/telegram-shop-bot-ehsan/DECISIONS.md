# Decisions — Telegram Shop Bot (Ehsan)

## 2026-07-26 — Project created
Classified as a **software project** with a heavy non-technical-operator UX constraint.
Nature: Telegram bot (storefront + admin) plus a background indexer of supplier channels.
The business is brokerage — Ehsan holds no stock and earns commission on suppliers'
invoices — so the bot's job ends at **lead generation**, not transaction.

Scoped OUT at intake, deliberately: payments, cart/checkout, inventory, invoicing and
accounting, multi-operator, supplier ratings, delivery tracking, web dashboard. Reason:
the owner asked explicitly for the idea to be completed *without* adding complexity or
options, and none of these are needed to prove the core loop.

## 2026-07-26 — How supplier channels get read (architectural, load-bearing)
**Problem.** A Telegram *bot* can only receive messages from channels it is a member of, and
bots cannot subscribe themselves — someone with admin rights must add them. Ehsan has no
admin rights in other shops' channels, so the plain Bot API cannot see supplier posts at all.
This invalidates the naive reading of the original idea ("the bot goes and searches the
reference links").

**Options considered.**
1. *Ask each supplier to add Ehsan's bot to their channel* — rejected. Depends on 10+
   competing shops' goodwill; unmaintainable as suppliers change.
2. *Reader logged in as a Telegram user account (MTProto)* that subscribes to the public
   supplier channels like a normal subscriber, read-only — **chosen**. It is the only route
   that matches how the business actually works. Reading channel history is the low-risk
   usage profile for a user account (member-list scraping, mass DMs and mass-adding are what
   trigger restrictions — none of which this does). Mitigations: dedicated phone number
   rather than Ehsan's personal account, read-only, modest polling rate.
3. *Ehsan forwards supplier posts into a private channel where his bot IS admin* — kept as
   the **fallback**. Zero platform risk and pure Bot API, but imposes daily manual work on a
   non-technical user, which contradicts the point of the project. Use only if option 2 is
   ruled unacceptable.

Requires owner/Ehsan approval before implementation: it needs a phone number and a login
session. Not actioned yet.

## 2026-07-26 — Quote the cheapest, but show Ehsan the runners-up
The original idea said "quote the cheapest to the customer". Kept — but the notification to
Ehsan also lists the next-cheapest suppliers with dates. Rationale: Ehsan's margin comes from
the supplier's invoice, so the cheapest shop is not automatically the best one for him
(stock, reliability, commission differ). The bot ranks; Ehsan decides. Also added a per-channel
priority ۱/۲/۳ so a trusted supplier can outrank a marginally cheaper unknown.

## 2026-07-26 — The customer never sees the supplier's name
Not in the original brief, but decided as a hard rule. If the customer learns which shop
holds the goods, they can buy direct and Ehsan's position disappears. Supplier identity stays
strictly on the admin side. Prices are quoted as-is (Ehsan's margin is the supplier's
commission, not a markup), so a markup feature is deliberately not built.

## 2026-07-26 — Product aliases are learned from real traffic, not pre-entered
The owner proposed an admin section where Ehsan defines each product with its many names.
Adopted — but **not** as the precondition for the bot working. Two layers instead:
normalized full-text search over indexed posts works on day one with an empty catalogue, and
the alias table grows through a "جستجوهای بی‌نتیجه" queue where Ehsan resolves real customer
searches one tap at a time. Rationale: asking a user with no computer skills to enter a
catalogue up front is the single most likely way this project dies unused.

## 2026-07-26 — Every price carries its post date; stale prices are not quoted as firm
Supplier channels update daily, so an indexed price has a shelf life. A confidently-quoted
stale price damages Ehsan's credibility with both sides. Prices beyond a configurable window
are shown as «نیاز به استعلام» instead of as a firm quote.

## 2026-07-26 — MTProto library not yet chosen; Telethon ruled out
Telethon, the usual choice, was **archived in February 2026** — not a dependency to start a
new project on. Maintained candidates: Kurigram and Pyrofork (both Pyrogram forks). Decision
deferred to build time via the `vet-tools` protocol with a fresh maintenance check. Recorded
in `toolbox/REGISTRY.md`.

## 2026-07-26 — Reader architecture reversed: manual forwarding becomes the design, MTProto dropped
The owner answered that **Ehsan already forwards supplier posts into his own channel** every
day, and the bot is admin there. That makes yesterday's fallback the primary design and removes
the entire MTProto reader: no second Telegram account, no phone number, no login session, no
account-restriction risk, no unattended background poller. Everything runs on the plain Bot API.

Unexpected bonus found while verifying: a forwarded post carries `forward_origin` naming the
original channel, so the bot identifies the source supplier **automatically**. Ehsan forwards
and does nothing else — no tagging, and the admin panel no longer needs channel registration;
suppliers self-populate. Verified against core.telegram.org/bots/api.

New risk this introduces: if a supplier channel enables "restrict saving content", its posts
cannot be forwarded at all. Must be checked per channel before build.

Supersedes the 2026-07-26 decision "How supplier channels get read". Registry entries for
Telethon / Kurigram / Pyrofork are now moot for this project and marked accordingly.

## 2026-07-26 — Product card: bot composes it, never forwards or copies the supplier's post
The owner wants the product photo, price and description shown to the customer, in a format
we standardize. Decided: the bot sends the photo by `file_id` with **its own caption** in a
fixed four-block layout (name → price → date → description), rather than forwarding or
`copyMessage`-ing the original post.

Rationale: forwarding would show «Forwarded from فروشگاه حامد», and even a copy carries the
supplier's caption verbatim — which typically contains their @username, channel link, and
phone number. Either would hand Ehsan's customer straight to his supplier, breaking the rule
the owner just confirmed. So descriptions are **sanitized** (usernames, t.me links, phone
numbers, "call to order" CTAs stripped), and any text that cannot be confidently cleaned is
dropped rather than shown. Prices and dates are re-rendered in one canonical form.

Storing only `file_id` and never the image also removes image storage from the cost model
entirely — Telegram keeps the file and re-serves it on demand.

## 2026-07-26 — Hundreds of products confirms the learn-from-traffic approach
Ehsan trades in **hundreds** of items. This turns "aliases are learned, not pre-entered" from
a nice-to-have into the decision the project's survival depends on: asking a user with no
computer skills to enter hundreds of products with their synonyms up front is the single most
likely way this bot is never used. Normalized text search carries day one; the
«جستجوهای بی‌نتیجه» queue grows the catalogue one tap at a time out of real customer demand.

## 2026-07-26 — Hosting: no Telegram-native hosting exists; serverless free tier instead
The owner believed Telegram recently added bot **hosting**. It did not. The feature is
**Managed Bots** (Bot API 9.6, April 2026): a parent bot can create and manage child bots and
obtain their tokens via a deep link, replacing BotFather token copy-paste. It manages bot
*identities*, not bot *code* — the logic still runs on infrastructure we provide. (Worth
remembering for later: if Ehsan ever wants to hand the same bot to other shopkeepers, Managed
Bots is exactly the mechanism.)

Zero cost is still reachable, because this bot needs **no always-on process** — the bot is
channel admin, so Telegram pushes updates by webhook; nothing polls or idles. Direction:
**Cloudflare Workers + D1 free tier** (100k requests/day, no credit card) against a workload of
a few hundred posts and orders per day. Final choice via `vet-tools` at build time.

Recorded honestly: a free tier has no service guarantee and its limits can change, so a
paid fallback (a few dollars a month) stays on the table for something a real business depends
on. n8n was noted as an alternative host if the owner already runs an instance, but a flow
builder is a poor fit for hundreds of products plus an alias table.
