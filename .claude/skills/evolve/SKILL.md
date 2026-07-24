---
name: evolve
description: >
  Handle a scope or requirement change on an existing project. Use whenever the user
  asks to add, change, or extend something in a project that already exists (e.g.
  "now I also want automated publishing", "add TikTok too", "my team should use it
  too", "I want a dashboard now"). Analyzes the delta instead of restarting.
---

# Evolve a Project

A new requirement is a **delta**, not a reset. Settled decisions stay settled unless
the delta genuinely invalidates them.

## Step 1 — Load current reality

Read `STATE.md`, `PROJECT.md`, and `DECISIONS.md` for the project (as in `resume`).
You cannot assess a change against a project you haven't loaded.

## Step 2 — Analyze the delta

Answer each of these concretely:

- **Adds:** what new capability/outcome does this request introduce?
- **Touches:** which existing parts of the project does it affect?
- **Activates:** does it pull any *deferred* or *irrelevant* dimension into scope?
  (This is the common case: "add a dashboard" activates software development, data
  storage, maybe auth and security — in a project that had none.)
- **Needs:** any new capability gaps → these go through `vet-tools`, not straight to
  adoption.
- **Conflicts:** does it contradict a logged decision? Name the decision and say so.
- **Costs:** new risk, financial cost, complexity, or maintenance burden it creates.
- **Untouched:** what explicitly does NOT change. Say this — it prevents accidental
  rework.

## Step 3 — Present the delta in plain language

Before implementing, give the user a short picture: "this adds A, changes B, brings in
C which we had left out because D, and creates risk/cost E; everything else stays as
is." If the delta involves anything from the approval list in CLAUDE.md (external
accounts, spending, publishing, credentials…), get explicit approval here.

If the delta is small and reversible (e.g. "also analyze competitor X"), skip the
ceremony — just confirm in one line and do it.

## Step 4 — Apply only the delta

- Update `PROJECT.md`: move activated dimensions into the right bucket, add new gaps,
  extend the goal only if the goal itself changed.
- Append the change and its reasoning to `DECISIONS.md` — including any prior decision
  it revises.
- Update `STATE.md` with the new next steps.
- Then do the work. Leave every untouched part of the project alone.
