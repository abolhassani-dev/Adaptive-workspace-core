# State — Telegram Shop Bot (Ehsan)
Updated: 2026-07-26

## Phase
**Design closed (v2), pending owner sign-off.** Intake done in two rounds, design rewritten
after the owner's answers.
**No implementation.** The owner asked explicitly to finalize and close the design first — do
not write bot code, do not set up hosting, do not touch the bot token until a build is
explicitly requested.

## Done
- Intake round 1: goal, brokerage model, non-technical-operator constraint
- Intake round 2 answers folded in — architecture got **simpler**:
  - Ehsan forwards supplier posts into his own channel where the bot is admin →
    **the entire MTProto reader is dropped**: no second Telegram account, no phone number,
    no login session, no account-restriction risk, no background poller. Plain Bot API only.
  - `forward_origin` identifies the source supplier automatically (verified against the Bot
    API docs) → suppliers self-populate; Ehsan registers nothing
  - Posts are name + photo + text description → OCR ruled out entirely, not deferred
  - Hundreds of products → confirms aliases must be learned from traffic, never pre-entered
  - Customer never sees the supplier: confirmed by the owner as a hard rule
  - Zero hosting cost required → webhook-driven serverless; Telegram-hosting belief corrected
- v2 design written (`DESIGN.md`): architecture, customer flow, **standardized product card**,
  price parsing, product identity, Ehsan's notification, admin panel, hosting, risks
- All decisions and superseded decisions recorded (`DECISIONS.md`)
- Registry updated: MTProto libraries marked moot for this project

## Next
1. Owner sign-off on the v2 design
2. Answer the three remaining open questions in `PROJECT.md` — the "restrict saving content"
   check is the only one that can still remove suppliers from the bot's reach
3. Then, and only on explicit request, start build:
   - `vet-tools` on Cloudflare Workers + D1 (and a paid fallback) before adopting
   - approval gate for the bot token
   - build order: index forwarded posts → search + product card → order capture →
     Ehsan's notification → admin panel → unmatched-search queue

## Blockers / waiting on
- Owner sign-off on the design; no code until then
- Approval gate (not yet requested): bot token creation and hosting account. Nothing set up
  or stored before that approval.
