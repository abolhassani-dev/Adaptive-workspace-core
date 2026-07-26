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

## 2026-07-26 — CORRECTION: Telegram Serverless exists; it is the host
**The previous entry was wrong.** The owner pushed back and was right. Telegram does offer
official hosting for bot backend code: **Telegram Serverless**
(https://core.telegram.org/bots/serverless). Confirmed from the official docs, not a summary.

What it is: JavaScript in an isolated V8 sandbox running on Telegram's own infrastructure next
to the Bot API, with a **built-in SQLite database** per bot (schema definition + query builder),
deployed via `npx tgcloud push` and migrated via `npx tgcloud migrate`. No server, no container,
no third-party account, no credit card.

Adopted as the host. Its two documented constraints were checked against this design and
neither bites:
- *No npm packages* (official SDK + own modules only) — Persian normalization, price parsing
  and search are dependency-free plain JavaScript.
- *File bytes cannot be uploaded or downloaded from a handler* (documented as temporary) — the
  bot only ever passes `file_id` strings and never touches image bytes. This design already
  avoided that path for cost reasons, so the constraint costs nothing.

Open at build time: Telegram publishes **no quotas or limits**, and the platform is new. Both
must be confirmed on a real deployment before Ehsan depends on it. Fallback if a hard limit
appears: Cloudflare Workers + D1 free tier — same shape of system, so it would be re-hosting
rather than a rewrite.

**Vercel evaluated and rejected**: its free Hobby tier forbids commercial use, and it ships no
database, so it would need a second free service attached. More accounts, more parts, and a
licence problem for a bot a business runs on.

Supersedes "Hosting: no Telegram-native hosting exists; serverless free tier instead". The
Managed Bots note in that entry stands and was a separate, real feature — just not hosting.

## 2026-07-26 — Ehsan's channel IS the reference; supplier attribution demoted to optional
Asked whether any supplier channel blocks forwarding, the owner answered that it does not
matter: **the reference is Ehsan's own channel**, and whatever is in it gets quoted. If a
channel blocks forwarding, Ehsan re-posts by hand.

Consequence: `forward_origin` supplier detection becomes a **bonus, not a dependency**. The
design must not require it. Resolved by always including a **link to the post in Ehsan's
channel** in the order notification — Ehsan taps it and sees whose post it is himself, whether
or not the bot knows. Nothing breaks on a hand-posted item.

Two simplifications fall out and are taken: the "restrict saving content" risk is closed, and
per-supplier trust ranking (priority ۱/۲/۳) is **dropped from v1** — with the reference being a
single channel, it was ceremony.

## 2026-07-26 — Cart added; one search entry point, not two
The owner asked for a home-screen section where the customer types a product name, sees it if
available, and gets three buttons: add to cart · new inquiry · back. This brings **a cart into
v1** — previously deferred as the v1.1 "multi-item orders" candidate. Accepted: this trade
genuinely needs multi-item orders, and the owner asked for it directly.

One change to what was requested: the separate «ثبت سفارش» menu entry is **removed** and merged
into this flow, which now ends at the cart's «ثبت سفارش». Two menu paths doing the same search
would be a duplicate path for a non-technical audience, against the owner's own "don't
complicate it" rule.

Also decided: cart totals are labelled «جمع تقریبی» with a confirmation note. Ehsan verifies
every price by phone, and a total that looks binding creates an argument he has to fight later.

Entry button worded «استعلام کالا» rather than the owner's alternative «موجودی ما» — Ehsan
holds no stock, so «موجودی ما» promises availability the bot cannot guarantee. Trivially
changeable if he prefers his own phrasing.

## 2026-07-26 — Multi-photo posts (albums) supported
The owner confirmed one product per post, but a post may carry several photos. Albums arrive as
several messages sharing a `media_group_id`, with the caption on the first. The indexer groups
them into one product and keeps every `file_id`.

Display constraint: Telegram does not allow buttons on an album. So the product card is sent as
two messages — the album, then the text block with its buttons directly beneath — which reads
as a single card in the chat. Accepted over the alternative (one photo plus a "more photos"
button), which costs the customer an extra tap on every single product view.

## 2026-07-26 — Build started; v1 implemented on Telegram Serverless
The owner created the bot and made it admin in Ehsan's reference channel — the two
prerequisites named at sign-off — so implementation began. Code lives in `bot/`.

Implementation decisions worth keeping:

- **Admin identity is set at runtime, not committed.** A one-time `/setadmin` claims the
  admin role and only works while no admin exists; the id is stored in a `settings` table.
  Nothing identifying enters the repository, and `lib/config.js` holds only tunables.
  Trade-off recorded: the claim is first-come, so it must be run before the bot is shared.
- **No `parse_mode` anywhere.** Supplier captions and customer names are arbitrary text;
  passing them through a Markdown/HTML parser turns a stray character into a failed send.
  Structure comes from emoji and line breaks instead.
- **Any plain text message is treated as a search.** Customers type the product name
  directly far more often than they tap a menu button first.
- **Group chats are ignored.** The storefront is one-to-one; answering in a group would
  show one customer's cart and phone number to everyone in it.
- **Prune runs inline, sampled** (roughly one post in twenty) rather than on a schedule —
  the platform is event-driven and this avoids needing a cron path at all.

## 2026-07-26 — Bug found by testing: Persian regex word boundaries
Price parsing was written with `تومان\b` and **never matched anything** — every single
price returned null, which would have shipped a bot that quoted «نیاز به استعلام» for
every product in the catalogue while looking perfectly healthy.

Cause: JavaScript's `\b` is defined over `[A-Za-z0-9_]`, so there is no word boundary
after a Persian letter. Fixed with a lookahead, `(?![؀-ۿ])`, which also does a job the
`\b` never could: it stops the bare «ت» from matching inside «۲۰۰۰ تایی» and inventing a
price out of a pack size.

Found by running `lib/text.js` and `lib/price.js` directly under node against 31 cases
(Persian/Arabic digits, ZWNJ, ي/ی folding, grouped separators, هزار/میلیون, ریال
conversion, ambiguous multi-price captions, and caption sanitization). Worth repeating
before any future deploy — the platform has no test runner, and this class of bug is
invisible until a real customer searches. Recorded in `bot/AGENTS.md` so it is not
reintroduced.

## 2026-07-26 — Telegram Serverless is NOT available; moved to Cloudflare Workers + D1
The owner checked BotFather and there is no **Serverless** entry — not in the bot menu
(API Token / Edit Bot / Bot Settings / Payments / Transfer Ownership / Delete Bot) and
not in Bot Settings (Inline Mode … Configure Mini App / Paid Broadcast). The feature is
documented and real, but not enabled for this account. I was wrong to keep suggesting it
was a client-version problem after the owner had already shown the menu.

Switched to the fallback identified at design time: **Cloudflare Workers + D1**, free
tier, no credit card, and — unlike Vercel — no prohibition on commercial use.

The port was cheap because the business logic never depended on the platform. All of
`lib/` carried over unchanged apart from import paths; two small shims absorbed the rest:
- `src/db.js` — a compatibility layer over Drizzle re-exposing `table`/`boolean`/`json`,
  so `schema.js` and every query stayed as written.
- `src/sdk.js` — `db` and `api` as `export let`, assigned per request by `init(env)`.
  ES module live bindings mean no request context had to be threaded through the code.

Three genuine API differences were fixed: `.returning().run()` → `.returning()` (in
Drizzle, `returning()` is itself terminal), `db.$count` → a projected `count()`, and
the D1 tables now need an explicit SQL migration alongside `schema.js`.

Also added, because the platform demands it: the Worker **always answers HTTP 200**, even
on error — a non-200 makes Telegram retry the same update indefinitely, which would
replay orders and re-notify Ehsan — and the webhook must be registered with
`allowed_updates` including `channel_post`, without which the bot never sees a product.

## 2026-07-26 — SECURITY: bot token exposed in a screenshot
The owner shared a screenshot with the full bot token visible. Flagged immediately and
told them to revoke it via BotFather → API Token → Revoke. Not used, not stored, not
echoed back. Recorded because the lesson is durable: the token is the whole bot, and it
must never travel through chat, screenshots, or this repository.

## 2026-07-26 — CORRECTION: Ehsan curates his own channel; newest wins, not cheapest
The owner clarified that no other shop's channel is involved at all: **Ehsan arranges his
own channel himself** — one post per product, with his own photos, names and prices. The
earlier picture of forwarding from ten supplier channels and comparing their prices was
a misunderstanding on my side that had survived three rounds.

The consequence is not cosmetic. Ranking was "cheapest fresh offer", which is right when
several shops compete and **wrong** for a single curated catalogue: when Ehsan re-posts a
product at a higher price, the cheapest match is the superseded post, so the bot would
have quoted an old low price and Ehsan would have eaten the difference on every raise.
Changed to **newest post wins**, with unpriced posts sorting last.

Removed as now meaningless: the runner-up "سایر مراجع" block in the order notification,
its `alternatives` column, and `MAX_ALTERNATIVES`. Kept: the `supplier` column (populates
harmlessly if he ever forwards) and caption sanitization (still the only thing stopping a
pasted supplier caption from handing his customer their phone number).

Grouping several posts under one product is still worth having — it is what makes a
re-post supersede the previous price rather than appear as a second product.

## 2026-07-26 — Deployed, entirely through the browser
The bot is live on Cloudflare Workers + D1 and responding in Telegram.

The owner cannot use a terminal, so the whole deployment was done in the browser: D1
created in the dashboard and migrated by pasting `bot/migrations/0001_init.sql` into the D1
console, the Worker connected to this repo via Workers Builds, secrets set in the dashboard,
and the webhook registered by opening the `setWebhook` URL in the address bar. Worth keeping
as the pattern for non-technical owners — no local tooling is needed at any point.

One design change came out of the deploy itself: a **wrangler config now sits at the
repository root** (`wrangler.toml` + `package.json`, with `main` pointing into
`projects/telegram-shop-bot-ehsan/bot/src`). Three builds had failed because the
root-directory setting is easy to get wrong in the dashboard and "Retry build" silently
replays the old build's branch, so corrections never took effect. Putting the config at the
root removes that setting from the equation entirely; the bot's code stays under `projects/`
where the workspace layout puts it. Verified from the root with `wrangler deploy --dry-run`.

Also recorded, because both cost real time and are not obvious: the Cloudflare Settings page
has **two** "Variables and secrets" sections — the one inside the Build box is build-time
only and does not reach the running bot — and `BotApiError: sendMessage: Not Found` means
the **token** is wrong or unset, not that anything is misrouted.

## 2026-07-26 — BUG: a priced older post beat a newer one, resurrecting superseded posts
Reported from live use: a product was re-posted under a second name with a new photo and new
specs, the two names were connected in the admin panel, and a customer searching the first
name was shown the **first** post's photo and description.

Cause, in `searchProducts`: offers were ordered priced-before-unpriced, and `best` was
`offers.find(o => o.price !== null)`. So a post whose price the parser could read outranked a
newer post whose price it could not — and the customer got the old photo, old description and
old price. Exactly the case the "newest wins" invariant exists to prevent.

Why it triggered so easily: the re-post's caption carried **two** prices («تکی» and «عمده»),
which `parsePrice` deliberately resolves to null. So a perfectly ordinary caption silently
resurrected the superseded post.

Fixed: `newestFirst` now sorts by post date alone, and `best` is simply the newest post. If the
newest post's price is unreadable the card says «نیاز به استعلام» beside the *new* photo, which
is honest; pairing a confident old number with a product that has since changed is not.

Reproduced against a real local D1 before and after the fix.

**Raised with the owner, not decided:** if Ehsan routinely writes two prices in one caption
(تکی / عمده), much of his catalogue will show «نیاز به استعلام». Which price should win is a
business decision — likely the single-unit one — and needs his answer before being coded.

## 2026-07-26 — Posting template adopted; "first price wins" replaces "ambiguous means null"
The owner asked for a **writing template** so Ehsan's posts always parse. Right instinct, and
it resolves the problem the previous bug exposed rather than patching around it.

Template (`bot/POSTING-GUIDE.md`, written in Persian for Ehsan):
```
line 1   product name
line 2   price
line 3+  description (any number of lines)
```

Because position now carries the meaning, the old rule — *a caption with two different prices
yields no price* — became actively harmful: an everyday «تکی … / عمده …» post produced
«نیاز به استعلام», so a shop full of normal captions would quote nothing at all. Replaced with
**the first price written wins**, scanning line by line.

This reverses the earlier decision "an ambiguous price is no price". Recorded as a reversal,
with the reason it is now the better trade: the risk it guarded against (a confidently wrong
price) is instead handled by three things already in place — the template puts the real price
on line 2, every card shows the price's date, and Ehsan confirms by phone before anything
binds. The cost it imposed (no price at all on ordinary posts) turned out to be much larger
than the risk it removed.

Deliberately unchanged: a caption with no currency marker anywhere still yields null, so
«استعلام قیمت» on line 2 is a supported way to publish a product without a price. The order
still goes through.

Also documented for Ehsan: editing a post does nothing (the bot never sees edits) — re-post to
change a price, which is also what makes newest-wins work.

Verified with 41 assertions across the template, price-only posts, multi-line descriptions,
two-price posts, ریال conversion, «هزار» forms, and pack sizes that must not read as prices.

## 2026-07-26 — Five-field posting template, parsed positionally
The owner specified the template: name / price / material / units-per-pack / description.
`src/lib/postformat.js` reads it and `posts` gained `material` and `pack` columns, so the card
shows them as their own labelled rows («🧱 جنس», «📦 هر بسته») instead of burying them in a
paragraph.

Position decides the field, because that is the rule Ehsan can remember. Two escape hatches
stop one slipped line from cascading — a forgotten material would otherwise turn the pack size
into the material and the description into the pack size:
- **a label wins over position, anywhere** — «جنس: استیل» is the material on any line;
- **a lone dash skips a field** without shifting the lines below it.

Also handled, because they occur in real captions: a wholesale price line («عمده …») is
recognised as a price and skipped rather than being read as the material; a line that is not a
price at all in position 2 gives up the price slot instead of swallowing the material; and
«استعلام قیمت» in position 2 means "no price" rather than sliding down a field.

## 2026-07-26 — Phone number required at the door
Every visitor must share their phone before the bot shows anything. Ehsan's entire workflow is
phoning people back, so a visitor without a number is a lead he cannot act on, and asking at
the door costs one tap on Telegram's own share button.

`/start`, `/id`, `/setadmin` and the contact message are deliberately outside the gate — a
first-time visitor still gets greeted, and Ehsan can claim the admin role before any customer
record exists. The admin is exempt from the gate entirely.

Consequence worth knowing: this is the point at which the bot starts holding personal data on
every visitor rather than only on buyers. Nothing is exported and no third party sees it.

## 2026-07-26 — One message per customer, rewritten in place
The owner asked for each step to replace the previous message rather than add one. Implemented
in `src/lib/screen.js`: the message id is kept per customer and every step edits it.

Three Telegram limits shape what this can be, and all three are worked around rather than
hidden:
- **A text message cannot become a photo message.** A change of kind deletes the old message
  and sends a new one, so it still reads as one evolving message.
- **Edits carry inline keyboards only.** The bottom reply menu is sent once at registration and
  left in place; every screen uses inline buttons.
- **A bot cannot delete a customer's own messages in a private chat.** Their typed lines remain.
  Told to the owner plainly rather than promising a fully clean chat.

One design change follows from it: a multi-photo post now shows the first photo on the card with
a «📷 عکس‌های بیشتر» button, instead of sending an album. An album is several messages that
cannot be edited or carry buttons — exactly the clutter this feature exists to remove.

## 2026-07-26 — Customer footprint report
New `events` table (kind: start | search | order) and a **📈 گزارش مشتری‌ها** section: active
customers, how many are new, searches with a found/not-found split, orders, and the last twelve
searches with the customer's name against each. Plus a customer list with per-person search and
order counts and last visit.

Only three event kinds are logged, not every tap: the report exists so Ehsan can see demand,
and per-tap logging would bury that signal and grow the table for nothing. `logEvent` never
throws — a failed log must not cost a customer their search.

Windows are rolling (last 24h / 7d / 30d) rather than calendar days, and labelled «گذشته» to
match. A calendar "today" needs a timezone, and getting that wrong reports the wrong day
silently.

## 2026-07-26 — Deleted channel posts stay in the index; cleanup added to the panel
The owner emptied the channel and the bot still reported «۳ پست فعال». Not a bug in the bot:
**Telegram sends a bot nothing when a channel post is deleted.** Only new posts arrive, so the
index cannot notice a removal, and the Bot API cannot read channel history to re-sync either.

Answered where Ehsan can reach it rather than in a database console he cannot use — a
**🧹 پاک‌سازی حافظه** section with two options behind a confirmation screen:
- *پاک کردن محصولات* — clears indexed posts, leaves customers, orders and aliases alone
- *ریست کامل* — clears everything for a clean test run, **keeping the admin** (the `settings`
  row holding his id is never touched, and his own session survives so the panel he is looking
  at does not break under him)

This matters beyond testing: it is the only way to withdraw a product Ehsan has stopped
selling. Recorded as a known gap that per-product removal does not exist yet — today it is all
products or nothing, which is fine while the catalogue is being built and not fine once he is
dropping individual items.

## 2026-07-26 — Per-product removal added
Closes the gap logged with the cleanup feature: withdrawing one item no longer means clearing
the whole catalogue. Ehsan types the product name, picks from the matches, confirms, and every
post of that product leaves the index.

**It deletes the whole offer group, not the post that was tapped.** A product re-posted three
times has three rows, so removing only the newest would resurrect the previous price the next
time a customer searched — the same class of bug as the superseded-post ranking bug earlier
today. Verified: two posts of one product both removed, an unrelated product untouched.

Aliases and the product row are deliberately kept. They cost nothing with no posts attached,
and if Ehsan lists the item again later the names he taught the bot still work.

Channel posts themselves are untouched and the confirmation screen says so — the bot has no
business deleting from his channel, and he may want the post to stay while the product is off
the shop.
