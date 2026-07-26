# State — Telegram Shop Bot (Ehsan)
Updated: 2026-07-26

## Phase
**Design / idea completion.** Intake done, v1 design written (`DESIGN.md`).
**No implementation.** The owner asked explicitly to finalize and close the design first —
do not write bot code, do not set up infrastructure, do not touch credentials until the
design is confirmed and a build is explicitly requested.

## Done
- Intake: goal, brokerage business model, and operator constraints understood
- Nature classified: software project with a non-technical-operator UX constraint
- Dimensions scoped in/out with reasons (`PROJECT.md`)
- Resolved the load-bearing constraint: a Telegram bot cannot read channels it isn't a
  member of → reader must be a user-account (MTProto) service, with a manual-forwarding
  fallback (`DECISIONS.md`)
- v1 design written: customer flow, Ehsan's notification, admin panel, product-alias
  strategy, out-of-scope list, risk table (`DESIGN.md`)
- Design decisions recorded, including four additions the original brief did not cover:
  hide supplier identity from customers, show runner-up suppliers to Ehsan, price freshness
  labelling, and aliases learned from traffic instead of pre-entered
- Telethon ruled out (archived Feb 2026); registry entry added for the MTProto library choice

## Next
1. Get answers to the five open questions in `PROJECT.md` — the price-format one
   (text vs. photos of price lists) is the only one that can change v1's shape materially
2. Confirm the four added design decisions with the owner, especially hiding the supplier name
3. Close the design: fold answers into `DESIGN.md`, mark it agreed
4. Only then, and only on explicit request: pick the MTProto library via `vet-tools`, decide
   hosting, and ask for approval on the phone number + bot token before any build begins

## Blockers / waiting on
- Owner's answers to the five open questions
- Approval gate (not yet requested): the reader needs a dedicated phone number and a Telegram
  login session; the bot needs a token. Nothing will be set up or stored before that approval.
