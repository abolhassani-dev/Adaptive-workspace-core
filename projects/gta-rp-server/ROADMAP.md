# Roadmap — GTA V Persian Roleplay Server

Single source of truth for phases and progress. Every work session updates the
checkboxes here; STATE.md points to the current phase. Nothing starts in a later
phase while its gate is unmet.

---

## Phase 0 — Foundation & decisions  `[current]`
Gate to Phase 1: VPS location chosen and server rented.

- [x] Intake: RP server, Iranian audience, owner + tester + Discord community
- [x] Research & pick stack: VMP platform + Qbox-style framework + txAdmin + MariaDB
- [x] Rule out Iran hosting (Cfx.re blocks Iranian IPs); foreign VPS from day one
- [x] Identify benchmark: Sunset RP (runs on VMP)
- [x] Platform pivot to VMP confirmed (Iranian scene lives there; GTA V free via launcher)
- [x] GTA 6 timing assessed: 3-5+ year runway for GTA V RP in Iran — project worth doing
- [x] Friends' ping check on Sunset RP: 14-60ms → Sunset hosts in Iran; our VPS = Iran
- [ ] Friends' likes/complaints about Sunset RP → Phase 2 design input
- [ ] Ask host support: GitHub/DockerHub access or internal mirror? sanction issues?
- [ ] Rent Iranian dev VPS: 8GB RAM + HIGH-CLOCK CPU (4.5GHz+, single-thread) + NVMe + anti-DDoS
      (16-24GB box deferred to public launch — see DECISIONS.md)

## Phase 1 — Engine on: bare server + admin panel
Gate to Phase 2: owner & tester join the server; admin panel fully working.

- [ ] Study VMP server docs (VMP Academy) — server files, master list, panel specifics
- [ ] Persian step-by-step VPS setup guide (written by Claude, followed by owner)
- [ ] VMP server + admin panel installed and reachable in browser
- [ ] RP framework deployed; MariaDB running
- [ ] Server registration/keys per VMP's system
- [ ] Owner + tester connect and play on the bare city
- [ ] Admin roles set up: owner = full control, tester = moderator
- [ ] Automated: scheduled restarts + database backups

## Phase 2 — Building the city (core RP)
Gate to Phase 3: tester signs off on core loop; friends' test session held.
Each module is a separate, self-contained resource — added one at a time,
tested, then the next.

- [ ] Identity: character creation, appearance, multicharacter
- [ ] Economy: bank, ATM, paycheck, cash
- [ ] Jobs: 2–3 starter legal jobs (e.g. trucker, taxi, delivery)
- [ ] Police & EMS: basic MDT, cuffs, hospital/respawn
- [ ] Vehicles: dealership, garage, fuel, keys
- [ ] Housing: buyable homes, storage, keys
- [ ] Inventory & shops: items, markets, restaurants
- [ ] Illegal layer: basic drugs/heists + gang territories (tuned by design input)
- [ ] Persian localization pass over every installed module
- [ ] Balance pass: prices/salaries tuned (informed by Sunset feedback)
- [ ] Friends' closed test session + feedback round

## Phase 3 — Identity & polish
Gate to Phase 4: owner satisfied with look & feel; whitelist flow works.

- [ ] Server name & brand (logo, colors) — options by Claude, owner picks
- [ ] Persian loading screen + connect experience
- [ ] Iranian flavor content: Iranian car pack, Persian billboards/plates
- [ ] Discord integration: whitelist bot, roles sync, log channels
- [ ] Custom HUD/UI skin
- [ ] (Optional, budget) commissioned custom MLO/vehicle

## Phase 4 — Public launch & operations
Ongoing after launch.

- [ ] Anti-cheat hardening beyond txAdmin defaults
- [ ] Server rules doc (Persian) + admin team onboarding
- [ ] Launch announcement to Discord community
- [ ] Event calendar (first month)
- [ ] Monitoring routine: performance, backups, incident playbook
- [ ] Growth: content creators, server lists — only after retention looks healthy

---

## How the server itself stays organized

The server will live in its own git repository (created in Phase 1), separate
from this planning folder. FiveM is inherently modular — every feature is an
isolated "resource" folder that can be added/removed without touching others:

```
server/
├── docs/              ← Persian guides: setup, admin manual, runbook
├── config/            ← server.cfg, txAdmin recipe, permissions
├── resources/
│   ├── [core]/        ← qbx_core, ox_lib, ox_inventory (framework — don't touch)
│   ├── [jobs]/        ← one folder per job
│   ├── [police-ems]/
│   ├── [vehicles]/
│   ├── [housing]/
│   ├── [economy]/
│   ├── [illegal]/
│   └── [ui-brand]/    ← loading screen, HUD, localization
└── sql/               ← database schema + seed data
```

Rules that keep it clean:
- One feature = one resource folder. Removing a feature = removing its folder.
- Never edit framework core; customization lives in our own folders/configs.
- Every change committed to git with a clear message → full history, instant rollback.
- Persian text centralized in locale files, not scattered in code.
