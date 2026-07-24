# Decisions — Instagram Growth

## 2026-07-24 — Project created
Nature: analysis + strategy + content for a personal brand (10k+, Business/Creator).
Phased per owner: (1) analysis & growth plan, (2) content production, (3) publishing.
Ruled OUT of current scope: software development, dashboards, multi-platform,
team access — none requested; publishing automation explicitly deferred to Phase 3.

## 2026-07-24 — Data access route
Start with **manual Insights export/screenshots** for the first analysis (zero setup,
zero account risk), and pursue the **official Meta Graph API** as the ongoing
connection (account qualifies; requires owner setup + explicit approval; full
vet-tools pass before anything is installed).
**Rejected:** unofficial scraping-based Instagram tools/MCPs — they violate
Instagram ToS, risk account flags/bans on a 10k+ page the owner cares about, and
typically require credentials handed to untrusted code. Popularity does not offset
this. Revisit only if Meta's official route becomes unavailable.

## 2026-07-24 — Instagram MCPs evaluated; none adopted for Phase 1
Owner asked whether Instagram MCPs exist. They do — vetted 3 candidates + the
scraping category (see toolbox/REGISTRY.md). All legitimate ones are wrappers over
the official Meta Graph API, so they need the exact same owner setup (Meta app +
token) an MCP-free approach needs. Decision: for Phase 1 (reading insights), call
the Graph API **directly with a minimal-scope token** (instagram_basic +
instagram_manage_insights) — zero third-party code, least privilege. Re-run
vet-tools on the two deferred self-hosted MCPs at Phase 3, when publishing tools
would actually pay for their wider scopes.
