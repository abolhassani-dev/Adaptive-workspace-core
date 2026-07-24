---
name: vet-tools
description: >
  Find and evaluate external capabilities (MCP servers, skills, plugins, agents,
  libraries, services) for a real capability gap in a project. Use when work hits a
  need that built-in capabilities can't cover well, or when the user asks for a tool.
  Never install or adopt an external tool without running this protocol.
---

# Tool Discovery & Vetting

The goal is a working capability for a named gap — not a tool collection. The default
outcome of this protocol is "no tool needed".

## Step 0 — Challenge the gap

State the gap in one sentence: *"In project X, step Y needs capability Z."*
If you cannot fill that sentence, stop — there is no gap, and no tool search.

Then ask: can built-in capability (reasoning, web search/fetch, writing code, file
work) cover Z at acceptable quality? If yes, do that. A tool must clearly beat
"Claude does it directly", accounting for setup cost, access risk, and maintenance.

## Step 1 — Check past experience first

Read `toolbox/REGISTRY.md`:

- **Adopted before for a similar gap?** Re-check fit for *this* project (never
  auto-adopt), and quickly confirm it's still maintained. If fine, reuse — done.
- **Rejected before?** Don't re-evaluate unless the rejection reason has expired
  (e.g. "unmaintained" but now active again).

## Step 2 — Search, in order of trust

1. Official sources: Anthropic docs/plugins/skills, official vendor MCP servers and
   APIs (e.g. Meta/Instagram official API for an Instagram project)
2. Known registries: the MCP registry, Claude Code plugin marketplaces
3. GitHub: search by capability, not by hype
4. Community: specialist forums, credible reviews — as evidence about candidates,
   not as a source of candidates by popularity alone

Collect 2–4 candidates max. This is procurement, not a survey.

## Step 3 — Evaluate each candidate

Stars and popularity are signals, not verdicts. Check:

- **Provenance** — who built it; is it official, from a known maintainer, or anonymous?
- **Maintenance** — recent commits/releases; responsive issues; or abandoned?
- **Docs** — can it be set up and used without guessing?
- **Access requested** — what permissions/scopes/data does it want? Is that more than
  the gap requires? Over-asking is a rejection reason by itself.
- **Security** — could it exfiltrate project files or data? Does read access smuggle
  in write/delete? Any known incidents?
- **Fit & proportion** — does it solve *this* gap without dragging in complexity the
  project doesn't need? Is there a simpler adequate option?
- **Real-world signal** — issues, discussions, actual user reports.

## Step 4 — Decide and get approval where required

Pick at most one tool per gap (or "none — handling it directly"). Anything from an
unofficial/unvetted source, or anything touching accounts, credentials, personal data,
or cost, requires user approval first — explained in plain language: what it does, why
this one, what access it gets, what the risk is, and what happens if we remove it later.

Apply least privilege on setup: minimum scopes, project-local configuration
(`.mcp.json` in the project folder or project-scoped config), secrets in environment
variables — never in this repository.

## Step 5 — Record the verdict (both outcomes)

Append to `toolbox/REGISTRY.md` — adopted AND rejected candidates, so future projects
inherit the experience. Also add adopted tools to the project's `PROJECT.md` toolbox
section with their role.

## Step 6 — Close the loop

A tool only counts if it gets used. When a project wraps a phase, check its toolbox:
anything adopted but unused gets removed and its registry entry updated to
`adopted-then-dropped` with the reason. That keeps the registry honest and the
workspace from becoming a tool graveyard.
