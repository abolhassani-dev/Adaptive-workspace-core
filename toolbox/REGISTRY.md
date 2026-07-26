# Tool Registry — cross-project experience ledger

Every external capability evaluated via the `vet-tools` protocol gets an entry here,
whether adopted or rejected. This is how the workspace gets smarter over time: future
projects check this file before searching the world again.

Rules:
- One entry per tool. If re-evaluated later, update the entry (keep the history line).
- Record rejections — they save the most time later.
- A registry entry is experience, not permission: adoption into a new project always
  re-checks fit and maintenance status.
- Never record secrets, tokens, or account details here.

Entry format:

```markdown
## <tool name>
- What: <one line — what it does>
- Source: <URL> (official / known maintainer / community)
- Gap it addressed: <the capability gap, one line>
- Verdict: adopted | rejected | adopted-then-dropped  (<date>)
- Why: <one or two lines>
- Access it needs: <scopes/permissions, one line>
- Used in: <project slugs>
- History: <date — event, e.g. "re-checked, still maintained">
```

---

## instagram-mcp (aayushjain1811)
- What: MCP server exposing Instagram Business tools (insights, posts, comments, DMs, publishing) over the official Meta Graph API
- Source: https://glama.ai/mcp/servers/aayushjain1811/instagram-mcp (community, MIT)
- Gap it addressed: live Instagram data access for analysis + later publishing
- Verdict: deferred (2026-07-24)
- Why: legitimate approach (official token, self-hosted, no scraping), but maintenance
  unverified ("unclaimed", no activity signal) and default scope set is far wider than
  Phase 1 needs (publishing, DMs, comments). Re-evaluate at Phase 3 (publishing) with
  a fresh maintenance check.
- Access it needs: Meta Graph API token; scopes incl. instagram_manage_insights,
  instagram_content_publish, instagram_manage_messages, pages_*
- Used in: —
- History: 2026-07-24 — evaluated for instagram-growth Phase 1

## instagram-mcp (aleemhaider)
- What: 24-tool MCP over official Instagram Graph API (profile, hashtags, publishing, comments, DMs, insights)
- Source: https://mcpservers.org/servers/aleemhaider/instagram-mcp (community)
- Gap it addressed: same as above
- Verdict: deferred (2026-07-24)
- Why: same profile as aayushjain1811 entry — official-API based and credible, but
  community-maintained (docs reference Graph API v21.0) and over-scoped for Phase 1.
  Candidate shortlist for Phase 3.
- Access it needs: long-lived Page token; instagram_basic, content_publish,
  manage_comments, manage_messages, manage_insights
- Used in: —
- History: 2026-07-24 — evaluated for instagram-growth Phase 1

## Outstand Instagram MCP (hosted SaaS)
- What: hosted MCP for publishing to Instagram et al. via official API, subscription (~$19/mo)
- Source: https://www.outstand.so/mcp/instagram (commercial)
- Gap it addressed: same as above
- Verdict: rejected for Phase 1 (2026-07-24)
- Why: creates recurring cost and routes account data through a third party's servers
  for a need (insights reading) that doesn't require either. Could be reconsidered at
  Phase 3 if self-hosted options fail vetting.
- Access it needs: OAuth to the Instagram account via their platform
- Used in: —
- History: 2026-07-24 — evaluated for instagram-growth Phase 1

## Scraping-based Instagram tools/MCPs (category)
- What: any tool using username/password, session cookies, or private-API scraping
- Source: various (community)
- Gap it addressed: n/a — categorically excluded
- Verdict: rejected (2026-07-24)
- Why: Instagram ToS violation; real ban/flag risk on a 10k+ account; credentials
  handed to untrusted code. Popularity does not offset this.
- Access it needs: full account credentials (that's the problem)
- Used in: —
- History: 2026-07-24 — category ruled out during instagram-growth intake

## Telethon (Python MTProto client)
- What: long-standing Python library for the Telegram MTProto (user-account) API
- Source: https://github.com/LonamiWebs/Telethon (community, MIT)
- Gap it addressed: reading posts from Telegram channels a bot cannot access
- Verdict: rejected (2026-07-26)
- Why: repository was **archived in February 2026** — no longer maintained. Not a base for a
  new project that must run unattended against an evolving API. Historically the default
  choice, so expect to see it recommended everywhere; that advice is now stale.
- Access it needs: Telegram user account (phone number + login session)
- Used in: —
- History: 2026-07-26 — evaluated for telegram-shop-bot-ehsan, ruled out on maintenance;
  same day the need itself disappeared (see approach note below) — kept as a standing warning,
  since Telethon is still the top recommendation everywhere and that advice is now stale

## Kurigram / Pyrofork (Pyrogram forks)
- What: maintained forks of Pyrogram, async Python MTProto clients for user accounts and bots
- Source: https://github.com/KurimuzonAkuma/kurigram · https://github.com/Mayuri-Chan/pyrofork (community)
- Gap it addressed: same — read-only indexing of public Telegram channels
- Verdict: shortlisted, not yet vetted (2026-07-26)
- Why: the actively-maintained successors after Telethon's archival and upstream Pyrogram's
  slowdown. Full `vet-tools` run (maintenance signal, license, dependency surface) deferred to
  build time — no library gets adopted while the project is still in design.
- Access it needs: Telegram user account (phone number + login session); read-only usage
- Used in: —
- History: 2026-07-26 — surfaced during telegram-shop-bot-ehsan intake, then **no longer needed**:
  the project switched to operator-forwarding + Bot API, so no MTProto client is involved.
  Entry kept for the next project that genuinely needs user-account reading

## Telegram user-account reading (MTProto) vs. Bot API (approach note)
- What: not a tool — the access-path constraint that shapes any "bot reads channels" project
- Source: https://core.telegram.org/bots/faq (official)
- Gap it addressed: reading channels the operator does not own
- Verdict: documented constraint (2026-07-26)
- Why: a **bot** only receives messages from channels it has been added to, and it cannot add
  itself — so any project whose premise is "the bot searches other people's channels" needs
  either a user-account (MTProto) reader, or the operator forwarding posts into a channel the
  bot administers. Worth checking first in any similar project: it decides the architecture.
  Risk profile for a user account: reading channel history is the low-risk usage; member-list
  extraction, mass DMs and mass-adding are what trigger account restrictions.
  **Check the forwarding route first** — it is strictly simpler and often already how the
  operator works. Two facts that make it attractive: a forwarded post carries `forward_origin`,
  so the bot still learns the original channel automatically, and photos can be re-sent by
  `file_id` forever without storing any image. Its limits: the operator must forward daily, and
  channels with "restrict saving content" cannot be forwarded from at all.
- Access it needs: forwarding route — only bot-admin rights in the operator's own channel.
  MTProto route — dedicated phone number + login session (never a personal account).
- Used in: telegram-shop-bot-ehsan (design stage — forwarding route)
- History: 2026-07-26 — established during telegram-shop-bot-ehsan intake; same day the
  forwarding route was chosen over MTProto and the MTProto dependency dropped entirely

## Telegram "Managed Bots" (Bot API 9.6) — is NOT bot hosting
- What: a parent bot can create and manage child bots via a deep link and fetch their tokens
  (`getManagedBotToken`), replacing manual BotFather token copy-paste
- Source: https://core.telegram.org/bots/api (official, released 2026-04-03)
- Gap it addressed: none — it was mistaken for a free way to *host* bot code
- Verdict: documented correction (2026-07-26)
- Why: Telegram manages bot **identities**, not bot **code**. There is no Telegram-native
  hosting; logic still runs on infrastructure you provide. Expect users to have heard otherwise.
  It *is* the right mechanism when one operator wants to hand copies of a bot to many others.
- Access it needs: bot management mode enabled via the BotFather mini app
- Used in: telegram-shop-bot-ehsan (ruled out as a hosting answer)
- History: 2026-07-26 — checked while answering a hosting-cost question

## Cloudflare Workers + D1 (free tier) as Telegram bot hosting
- What: serverless edge compute plus serverless SQL; bot runs as a webhook handler
- Source: https://developers.cloudflare.com · https://grammy.dev/hosting/cloudflare-workers (official)
- Gap it addressed: running a Telegram bot 24/7 at zero cost, with no server to maintain
- Verdict: **adopted** (2026-07-26)
- Why: a channel-admin bot receives updates by **webhook**, so it needs no always-on process —
  which is what makes a free serverless tier a genuine fit rather than a compromise. Free tier
  is 100k requests/day with no credit card. Storing Telegram `file_id` instead of images keeps
  storage near zero. Caveats to state plainly to any owner: a free tier carries no service
  guarantee and its limits can change, so identify a paid fallback before depending on it.
- Access it needs: a Cloudflare account; bot token stored as a secret/env var, never in a repo
- Used in: telegram-shop-bot-ehsan
- History: 2026-07-26 — surfaced answering a zero-cost hosting requirement, demoted to fallback
  when Telegram Serverless turned out to exist, then adopted when Serverless proved unavailable
  for the account. Practical notes from the port: `wrangler deploy --dry-run` and
  `wrangler dev --local` both work with **no Cloudflare account**, so a Worker can be built and
  fully exercised before the user ever signs up; D1 needs hand-written SQL migrations alongside
  the ORM schema; and the webhook handler must always answer HTTP 200 or Telegram retries the
  same update forever.

## Telegram Serverless (official)
- What: runs a bot's backend JavaScript on Telegram's own infrastructure — isolated V8 sandbox
  next to the Bot API, with a built-in SQLite database per bot (schema + query builder),
  deployed via `npx tgcloud push`, migrated via `npx tgcloud migrate`
- Source: https://core.telegram.org/bots/serverless (official)
- Gap it addressed: hosting a Telegram bot 24/7 at genuinely zero cost, with no server to run
- Verdict: **unavailable in practice** (2026-07-26)
- Why: **check BotFather before promising it.** For this owner's account there was no
  Serverless entry at all — not in the bot menu, not in Bot Settings — so the feature could
  not be used no matter how well it fit. On paper it is excellent: official and first-party,
  no third-party account, no credit card, no VPS, and the database comes with it instead of
  being a second service to bolt on. For a bot whose owner
  will not pay anything, this beats every free tier because there is no free tier to age out of.
  **Check its two constraints against the design before adopting**: no npm packages (official
  SDK and your own modules only), and file bytes cannot be uploaded or downloaded from a handler
  (documented as temporary). Passing `file_id` strings around is fine and unaffected.
  Telegram publishes **no quotas or limits** — confirm on a real deployment before depending on
  it, and keep a same-shape fallback (Cloudflare Workers + D1) identified in advance.
- Access it needs: the bot's own token; nothing else
- Used in: telegram-shop-bot-ehsan (attempted, then abandoned for Cloudflare)
- History: 2026-07-26 — found only after the owner pushed back on a wrong "Telegram doesn't host
  bot code" answer; then found to be unavailable for their account. Two lessons: the platform is
  new enough that general search and model recall both miss it, so read core.telegram.org
  directly — and availability is per-account, so have the user confirm the BotFather entry
  exists before designing around it. `npx tgcloud init` scaffolds with no credentials, which is
  a free way to read the real SDK docs regardless.

## Vercel free (Hobby) tier as Telegram bot hosting
- What: serverless functions on Vercel's free plan
- Source: https://vercel.com (commercial)
- Gap it addressed: same — zero-cost bot hosting
- Verdict: rejected (2026-07-26)
- Why: the Hobby tier **forbids commercial use**, which a shop's order bot plainly is — a
  licence problem, not a technical one. It also ships no database, so a second free service
  would have to be attached, adding accounts and moving parts. Worth stating whenever someone
  proposes Vercel free for a business tool.
- Access it needs: a Vercel account, plus a separate database provider
- Used in: —
- History: 2026-07-26 — evaluated for telegram-shop-bot-ehsan

## Drizzle ORM (with Cloudflare D1)
- What: TypeScript/JS SQL query builder and schema DSL; `drizzle-orm/d1` binds it to Cloudflare D1
- Source: https://orm.drizzle.team (open source, actively maintained)
- Gap it addressed: a data layer for a bot moved off a platform whose built-in database had a
  near-identical API
- Verdict: adopted (2026-07-26)
- Why: the previous platform's database DSL was Drizzle-shaped, so a ~30-line compatibility
  module (re-exposing `table`/`boolean`/`json` and the operators) let an entire project's
  queries move hosts unchanged. Worth remembering as a porting tactic: when two platforms have
  similar-but-not-identical APIs, a shim at the boundary beats rewriting the call sites.
- Differences that bit during the port: `.returning()` is itself terminal (no `.run()` after it),
  `db.$count` is version-dependent so a projected `count()` is safer, and Drizzle does **not**
  create tables — D1 needs its own SQL migration kept in step with the schema.
- Access it needs: none beyond the D1 binding
- Used in: telegram-shop-bot-ehsan
- History: 2026-07-26 — adopted during the move to Cloudflare Workers
