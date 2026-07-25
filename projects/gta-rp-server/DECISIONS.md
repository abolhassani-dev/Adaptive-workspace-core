# Decisions — GTA V Persian Roleplay Server

## 2026-07-25 — Project created
Nature: software assembly + operations + community. Persian RP server for Iranian
players; local PC hosting first, public VPS deferred until tester approves core
gameplay. Clarified that official Rockstar "GTA Online" cannot be self-hosted —
project targets the FiveM community-server ecosystem instead.

## 2026-07-25 — Platform: FiveM (over RAGE:MP and alt:V)
FiveM chosen: by far the largest ecosystem and script market, txAdmin admin panel
bundled for free, best documentation, active Iranian/Persian server scene proves
viability from Iran. RAGE:MP and alt:V rejected: smaller ecosystems, no bundled
admin panel, fewer ready-made RP resources — would mean far more custom code for
the same result.

## 2026-07-25 — Framework: Qbox (over QBCore and ESX)
Qbox (qbx_core + ox_lib + ox_inventory + oxmysql) chosen: actively maintained
successor to QBCore, modern Lua 5.4, better performance/security, and backwards
compatible with the huge QBCore script ecosystem. QBCore rejected: development
has largely stalled in 2025–2026; only sensible for servers already invested in
it. ESX noted as a viable alternative (largest install base, slightly better raw
CPU numbers in some benchmarks) but rejected for a new 2026 build: older
architecture, and Qbox's ox-native stack is the recommended path for new servers.

## 2026-07-25 — Admin panel: txAdmin (no custom panel for now)
The "full control admin panel" requirement is covered by txAdmin: web panel
(start/stop/restart, deployment recipes, live per-resource CPU/RAM, scheduled
restarts, logs, Discord integration, crash recovery) + in-game menu (teleport,
spawn, heal, spectate, freeze) + granular admin roles, HWID-based bans, VPN
detection, warn thresholds with auto-ban. Building a custom web panel from
scratch was rejected: months of work to reimplement what ships free and official
with FXServer. A custom panel can be revisited later only for needs txAdmin
provably cannot cover.

## 2026-07-25 — Hosting: foreign VPS from day one (Iran hosting ruled out)
Owner proposed renting a server immediately instead of local-PC testing — accepted:
real-conditions testing from day 1, no migration later. Iran-based hosting is
REJECTED as technically impossible, not just risky: Cfx.re/Cloudflare blocks
Iranian IP ranges — Iran-hosted servers can't authenticate or appear in the
server list (confirmed via Cfx.re forum reports, 2024-2026). Location shortlist:
Turkey (lowest ping ~40-80ms from Iran) vs Germany (~80-120ms, best
infrastructure/price, proven by existing Persian servers). RP tolerates
80-150ms. Pending: friends' ping on Sunset RP as the acceptance bar; buy via
Iranian toman-based resellers due to payment sanctions. ~8GB RAM VPS,
~$10-20/month to start.

## 2026-07-25 — Platform pivot: VMP (vmp.ir) instead of vanilla FiveM
Owner reported the Iranian scene has migrated from FiveM to VMP — research
confirmed: VMP is an Iranian FiveM-compatible platform (open source at
github.com/v-mp/vmp, described as "FXServer-like", ~12k commits). Sunset RP
itself runs on VMP. Why the scene moved: Cfx.re blocks Iranian IPs, and VMP
distributes GTA V free via its launcher (no original-copy requirement — key in
Iran where buying is blocked by sanctions). Impact on our stack: minimal — the
server side mirrors FXServer, so txAdmin + Qbox/QBCore-style frameworks and the
FiveM script ecosystem carry over. Phase 1 will follow VMP's own docs (VMP
Academy at forum.vmp.ir) for server files + their launcher/master-list specifics.
Vanilla FiveM dropped because our audience literally cannot be there.

## 2026-07-25 — GTA 6 timing: project is worth doing now
Owner asked whether GTA 6 (consoles 2026-11-19) undermines the project. Verdict:
no. PC version expected ~late 2027 (Rockstar pattern: GTA V console→PC took 19
months); a moddable multiplayer scene takes further years after that (GTA V RP
boom came 4+ years post-launch); Iranian players' hardware and sanctions make
migration even slower; and VMP gives GTA V free. Realistic runway for Persian
GTA V RP: 3-5+ years. The community/brand we build is transferable to whatever
platform succeeds it.

## 2026-07-25 — Hosting reversal: Iranian VPS (single server until launch)
The earlier "Iran hosting impossible" ruling applied to FiveM's Cfx.re blocks —
VMP runs its own independent infrastructure, so it doesn't apply. Field data
confirms: friend (Ehsan) reports 14-20ms ping on Sunset RP (gaming ISP; others
50-60ms) — only possible if Sunset hosts inside Iran. Decision: rent ONE Iranian
game VPS (Tehran Gaming / ParsVDS / similar, anti-DDoS, toman pricing) and use
it as the dev server. Owner's dev-abroad + prod-Iran two-server idea: good
instinct, adopted but re-shaped — dev/prod split activates at public launch
(current server becomes staging, stronger one rented for prod); both in Iran.
Foreign VPS dropped entirely. Watch item: Iranian DCs sometimes struggle
downloading from GitHub/foreign sources (two-way sanctions) — known workarounds
exist; revisit only if it bites in Phase 1.

## 2026-07-25 — Sanctions/download risk on Iranian VPS: real but mitigated
Owner flagged that an Iranian VPS may fail to download some resources (GitHub,
Docker, npm, Linux package repos) due to OFAC sanctions / "Forbidden" errors.
Confirmed real (2026 escalation tightened it). Mitigations, in order:
(1) VMP core + many popular scripts are hosted on Iran-friendly infra — download fine;
(2) use the host's internal mirrors (Docker/npm/PyPI/apt) — most Iranian game hosts
    provide these;
(3) fallback: Claude assembles any blocked foreign resource, owner downloads it via
    their own (working) connection and uploads to the server — one-time setup cost.
ACTION before buying: ask the host support two questions — (a) direct GitHub/DockerHub
access or internal mirror? (b) any sanction issues running a VMP/FiveM server? Pick a
host that answers yes/handled. Prefer gaming-focused hosts (their whole market is this).
