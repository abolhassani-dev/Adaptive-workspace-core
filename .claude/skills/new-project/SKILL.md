---
name: new-project
description: >
  Start a new project in this workspace. Use whenever the user describes a new goal,
  idea, or project in natural language (e.g. "I want to grow an Instagram page",
  "I want to build an accounting assistant") and no matching folder exists in
  projects/. Runs intake, classifies the project's real nature and needed dimensions,
  and creates the project's memory files.
---

# New Project Intake

Goal: understand the project correctly **before** producing any work, and leave behind
a charter that any future session can pick up. Intake is a conversation, not a form.

## Step 1 — Understand the goal as stated

Restate the user's goal back in one or two sentences in their own language. If your
restatement is wrong, this is the cheapest moment to find out.

## Step 2 — Ask only the questions that matter

Ask at most ~5 questions, batched together, and only questions whose answers would
change your approach. Good candidates:

- What does success look like? (concrete outcome, not vibes)
- Who is this for? (audience / customer / just the user)
- What exists already? (current page, current data, existing code, prior attempts)
- Constraints: budget, time, platform, language, regulation
- What is explicitly out of scope for now?

Do NOT ask about technology, architecture, or tools — that is your job to figure out.
If the user doesn't know an answer, note it as an open question and move on.

## Step 3 — Determine the project's nature

Decide what kind(s) of work this actually is: research / consulting-analysis /
content / design / software / operations / a mix. Say it explicitly. This drives
everything else. "Grow an Instagram page" is analysis + content + design until proven
otherwise — it is not a software project.

## Step 4 — Scan dimensions broadly, include narrowly

Walk this list as *candidate angles*, not requirements:

goal & core problem · user/customer need · business & revenue model · market &
competitors · product · UX · visual identity · content · research · data & analytics ·
software development · AI · integrations · security · privacy · testing & QA ·
operations · maintenance · documentation · legal & regulatory

Classify each relevant one into exactly one bucket, with a one-line reason:

- **Essential** — the project fails without it
- **Optional** — useful, propose but don't assume
- **Deferred** — likely matters later; note the trigger that would activate it
- **Irrelevant** — silently skip (do not list twenty irrelevant items back at the user)

## Step 5 — Identify real capability gaps

For each essential dimension, ask: can I do this well with built-in capabilities
(reasoning, web search, file work, code)? Only where the honest answer is no, note a
capability gap. Do not go tool-shopping during intake — record gaps in the charter and
run the `vet-tools` skill when the work actually reaches that gap.

## Step 6 — Create the project folder

Pick a short kebab-case slug and create `projects/<slug>/` with three files.
Adapt the templates to the project — drop sections that don't apply, don't pad.

`PROJECT.md`:

```markdown
# <Project name>

## Goal
<one paragraph — the real objective and what success looks like>

## Nature
<research / content / software / mix — one line>

## Dimensions
### Essential
- <dimension> — <why>
### Optional
- <dimension> — <why / what it would add>
### Deferred
- <dimension> — <trigger that activates it>

## Capability gaps
- <gap> — <status: open / tool adopted (see toolbox)>

## Toolbox (this project)
<empty until a tool passes vetting; then: tool — role — access — why chosen>

## Open questions
- <what we still don't know>
```

`STATE.md`:

```markdown
# State — <Project name>
Updated: <date>

## Phase
<where the project is right now, one line>

## Done
- …

## Next
- <the single most useful next action first>

## Blockers / waiting on
- …
```

`DECISIONS.md`:

```markdown
# Decisions — <Project name>

## <date> — Project created
<nature + key scoping choices from intake, including what was ruled OUT and why>
```

## Step 7 — Propose the path, then start

Present to the user, in plain language: what kind of project this is, what you'll
focus on, what you deliberately left out, and the first 1–3 concrete steps. Get a
quick confirmation on scope, then begin the actual work. Intake that ends without
starting real work is a failure.
