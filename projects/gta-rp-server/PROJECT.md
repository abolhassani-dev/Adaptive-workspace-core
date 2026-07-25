# GTA V Persian Roleplay Server

## Goal
Build a high-quality Persian-language GTA V roleplay server for Iranian players,
with a full-control admin panel. Owner runs it initially on their own PC (with a
game tester available), then moves to public hosting when it's ready. Success =
a stable, playable RP server (jobs, economy, police/gangs, inventory, housing)
that the tester approves, fully manageable through an admin panel, with the
owner's existing Discord community onboarded.

Note: "GTA Online server" here means a community multiplayer server on a mod
platform (FiveM) — Rockstar's official GTA Online cannot be self-hosted.

## Nature
Software (server assembly, configuration, scripting) + operations + community.
Mostly assembling and customizing proven open-source components, not writing a
server from scratch.

## Chosen stack (from 2026-07-25 research — see DECISIONS.md)
- **Platform:** VMP (vmp.ir) — Iranian FiveM-compatible platform ("FXServer-like",
  open source). The Iranian scene (incl. Sunset RP) lives here because Cfx.re
  blocks Iranian IPs and VMP's launcher provides GTA V free. Server-side stack
  mirrors FiveM, so the choices below carry over.
- **Framework:** Qbox (qbx_core + ox_lib + ox_inventory + oxmysql) — actively
  maintained QBCore successor, modern Lua 5.4, backwards compatible with the huge
  QBCore script ecosystem.
- **Admin panel:** txAdmin — bundled with FXServer; web panel (server lifecycle,
  deployment recipes, live resource CPU/RAM, scheduled restarts, logs, Discord
  integration) + in-game admin menu (teleport, spawn, heal, spectate, freeze) +
  granular permissions, HWID bans, VPN detection, auto-ban on warn thresholds.
- **Database:** MariaDB/MySQL via oxmysql.

## Working model
Claude designs, writes, and versions everything in this folder (setup guides,
server config, txAdmin recipe, custom scripts, Persian localization). The owner
runs FXServer on their Windows PC following the guides; the tester plays and
reports; Claude iterates. Claude cannot run the game server itself.

## Dimensions
### Essential
- Platform & framework setup — the server does not exist without it
- Admin panel & permissions — explicit core requirement (full control)
- Core RP gameplay (jobs, economy, inventory, police/EMS, vehicles) — what players come for
- Persian localization — target audience is Iranian; UI/notifications in Farsi
- Testing & QA — tester loop is the main quality gate before public launch
- Operations basics — backups, scheduled restarts, crash recovery (txAdmin covers most)

### Optional
- Custom branding & UI (loading screen, HUD skin, server identity)
- Discord integration (whitelist bot, roles sync, logs channel)
- Extra content packs (custom cars, MLO maps) — heavy, add after core is stable

### Deferred
- Public VPS hosting — trigger: tester approves core gameplay and owner wants launch
- Anti-cheat hardening beyond txAdmin defaults — trigger: public launch
- Monetization (VIP, donations) — trigger: stable public server; must respect Cfx.re ToS

## Capability gaps
- None requiring external workspace tools yet. The stack above is project
  infrastructure the owner installs on their machine, not workspace tooling.

## Toolbox (this project)
- FiveM FXServer — game server runtime — runs on owner's PC — industry standard
- txAdmin — admin panel — bundled with FXServer, no extra install — official
- Qbox framework — RP gamemode base — open source (Qbox-project on GitHub) — actively maintained

## Benchmark
Sunset RP (sunsetrp.ir) — one of the biggest Persian FiveM RP servers; the owner's
friends currently play there. Use as the reference bar for features/quality, and
gather friends' likes/complaints about it as design input for Phase 2. Friends are
also candidate first players.

## Open questions
- Server name / brand identity?
- Whitelist (Discord-gated) or open access at launch?
- VMP specifics to verify in Phase 1: exact server files/licensing, how their
  master list works, whether txAdmin ships as-is or VMP has its own panel variant.
