# Proposed edits — prepared before Ehsan's feedback

Written 2026-07-26, after the bot went live and the first real caption was tested. This is my
own list from having built it: what I already know is missing, weak, or risky. Ehsan's feedback
after a few days of real use should be merged into it — where the two agree, that item goes
first.

Nothing here is started. Effort is rough: **S** ≈ under an hour, **M** ≈ a few hours,
**L** ≈ a day or more. Items marked **⚠ migration** need SQL pasted into the D1 console.

---

## A. Before the bot reaches real customers

These are not improvements, they are things that are currently wrong.

**A1. Rotate the bot token and the webhook secret** — S
Both appeared in full in screenshots during setup. Anyone who saw them can send messages as the
bot and read what customers send it. Right now that is only test data; the moment real customers
arrive it is their names and phone numbers. BotFather → Revoke, update `BOT_TOKEN`, pick a new
`WEBHOOK_SECRET`, re-run `setWebhook`.

**A2. A per-customer rate limit** — S, ⚠ migration
The bot's URL is public and anyone with the link can search without limit. Each search runs
several D1 queries, and the free tier has a daily ceiling — one bored person could exhaust the
day's budget and take the shop offline for everyone. A simple counter per customer per minute,
and a polite «کمی صبر کنید» beyond it.

**A3. Tell the customer when their order status changes** — M
Ehsan taps ✅ انجام شد or ❌ منتفی شد and the customer is told nothing. They are left waiting on
a call that may already have happened or been cancelled. The status buttons already exist; they
just need to message the customer too. **This is the single biggest gap in the current flow** —
the bot captures the lead and then goes silent.

---

## B. Likely to come straight from Ehsan

My guesses at what a few days of use will surface. Ordered by how likely I think each is.

**B1. Editing a post should update the bot** — M
`edited_channel_post` is not handled, so an edit is invisible; the guide says to re-post instead.
Habit will win over the guide, and he will edit. Handling it is a small handler that finds the
post by message id and re-parses it.

**B2. Change a price without re-posting** — M
The panel can delete a product but not adjust it. A «✏️ تغییر قیمت» that writes the new price
straight to the index would save him a re-post when he just mistyped a number.

**B3. See what the bot actually has** — S
The panel reports a count («۱۲ پست فعال») but never a list. He cannot answer "is the قالب کنگره
in there?" without searching as a customer. A «📋 فهرست محصولات» with names, prices and dates.

**B4. Change an old order's status** — M
The status buttons live only on the notification message. Once it scrolls away, an order is
frozen at whatever it was. The 📊 سفارش‌ها list should carry the same buttons.

**B5. A daily summary pushed to him** — S
He has to open the panel to see the report. One message each morning — how many searches, how
many orders, what was searched and not found — is the version he would actually read. Needs a
Cron Trigger, which Cloudflare Workers has on the free plan.

**B6. Customer notes on an order** — S
«فوری است», «تا پنجشنبه لازم دارم». Right now there is nowhere to put it, so the customer will
type it as a search and confuse the bot. One optional free-text step before confirming.

---

## C. Search quality — where I expect the real complaints

**C1. Fall back to a looser match before saying "not found"** — M
Search currently requires **every** word the customer typed to appear. «قالب کنگره ۹ سانت»
misses a post titled «قالب کنگره ۸/۵» because of one word. When the strict search finds nothing,
retrying with "most words match" — and labelling the results «شاید این‌ها را می‌خواستید» — would
turn a dead end into a sale. **I think this is the highest-value item on the whole list**, because
a not-found is a customer who leaves.

**C2. Show more than five results, and say when there are more** — S
`MAX_RESULTS` silently truncates at five. A customer searching «قالب» has no idea there were
twelve.

**C3. Browse without knowing the name** — L
A customer who does not know what the item is called has no path at all today. Options: a
«🗂 دسته‌بندی» from a category line in the post template, or a «🔥 پرفروش‌ها» list built from
what people actually search. The second needs no work from Ehsan, which is why I would try it
first.

**C4. Rank by what customers actually pick** — M
When several products match, order them by how often customers chose each one, rather than by
title match alone. The `events` table already records the searches; picks would need logging too.

---

## D. Operational — invisible until it fails

**D1. Warn when the channel goes quiet or the bot starts erroring** — S
Today a failure is only visible in Cloudflare's logs, which nobody will open. If no post has
arrived in N days, or if handlers start throwing, the admin should get a message. Silence
currently looks identical to "everything is fine".

**D2. Document D1 backup and restore** — S
Customers, orders and the alias catalogue live in one D1 database with no documented recovery.
Cloudflare's Time Travel covers it, but only if someone knows it exists before they need it.

**D3. Make migrations less error-prone** — M
Every schema change is hand-pasted SQL, and forgetting it produces confusing runtime errors —
already happened once. Either a single idempotent "run everything" block kept up to date, or a
build step that applies migrations on deploy.

**D4. A way to delete a customer's data on request** — S
Names and phone numbers are stored with no way to remove one person. Worth having before it is
asked for rather than after.

---

## E. Business direction — only if Ehsan asks

**E1. Markup on top of the supplier price** — M. Deliberately not built: his margin is the
supplier's commission. Only relevant if that model changes.
**E2. A second operator** — M, ⚠ migration. The admin is a single telegram id. Relevant when he
hires help.
**E3. Multiple items per photo / a real catalogue post** — L. The template is one product per
post. If he starts posting price lists, this becomes a different project.
**E4. Payment** — L. Ruled out at design time and I would keep it out. His business is the phone
call.

---

## What I would do first

If nothing came back from Ehsan at all, in order: **A1, A3, A2** (the bot is unsafe and silent
without them), then **C1** (a not-found is a lost customer), then **B1 and B3** (the two things
he will bump into within a week).

Everything in section E stays untouched until he asks — each item there adds a concept he would
have to learn, and the project's whole premise is that he never has to.
