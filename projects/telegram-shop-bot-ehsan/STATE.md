# State — Telegram Shop Bot (Ehsan)
Updated: 2026-07-26

## Phase
**Design closed (v3), pending owner sign-off.** Intake ran three rounds; design rewritten
after each.
**No implementation.** The owner asked explicitly to finalize and close the design first — do
not write bot code, do not deploy, do not create the bot token until a build is explicitly
requested.

## Done
- Intake round 1: goal, brokerage model, non-technical-operator constraint
- Intake round 2: Ehsan forwards supplier posts into his own channel where the bot is admin →
  **the entire MTProto reader dropped** (no second account, no phone number, no login session,
  no account risk, no background poller). Plain Bot API only. Posts are text → OCR ruled out.
  Hundreds of products → aliases must be learned from traffic. Hiding the supplier confirmed.
- Intake round 3:
  - **Hosting resolved — and an earlier answer of mine corrected.** The owner was right that
    Telegram added hosting: **Telegram Serverless** (JS in a V8 sandbox on Telegram's own
    infrastructure, built-in SQLite, `npx tgcloud push`). Adopted. Its two constraints — no npm
    packages, no file-byte upload/download — were checked and neither affects this design.
    Vercel evaluated and rejected (Hobby tier forbids commercial use; ships no database).
  - Ehsan's channel **is** the reference → supplier attribution demoted from required to
    best-effort; every notification links to the post instead. Forwarding-restriction risk
    closed; per-supplier trust ranking dropped as ceremony.
  - **Cart added to v1** at the owner's request, with one merged search entry point rather
    than two overlapping ones.
  - Multi-photo posts (albums) supported; card sent as album + text-with-buttons.
- v3 design written (`DESIGN.md`); all decisions and supersessions recorded (`DECISIONS.md`);
  registry updated (Telegram Serverless, Vercel rejection, MTProto entries marked moot)

## Next
1. Owner sign-off on the v3 design
2. Then, and only on explicit request, start build:
   - approval gate: create the bot token via BotFather; add the bot as admin to Ehsan's channel
   - stand up Telegram Serverless and **confirm its real quotas** before anything depends on it
   - build order: index forwarded posts (incl. albums) → search + product card → cart →
     order capture → Ehsan's notification → admin panel → unmatched-search queue
3. Test with a handful of real forwarded posts before Ehsan gives the bot to any customer

## Blockers / waiting on
- Owner sign-off on the design; no code until then
- Approval gate (not yet requested): bot token creation. Nothing created or stored before that.
- Telegram Serverless quotas are unpublished — answerable only by deploying, so it is a
  build-time check, not a question for the owner
