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
- History: 2026-07-26 — evaluated for telegram-shop-bot-ehsan, ruled out on maintenance

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
- History: 2026-07-26 — surfaced during telegram-shop-bot-ehsan intake

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
- Access it needs: dedicated phone number + login session (never the operator's personal account)
- Used in: telegram-shop-bot-ehsan (design stage)
- History: 2026-07-26 — established during telegram-shop-bot-ehsan intake
