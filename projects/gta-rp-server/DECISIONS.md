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
