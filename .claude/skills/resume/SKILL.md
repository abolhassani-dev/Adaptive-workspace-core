---
name: resume
description: >
  Continue an existing project in this workspace. Use whenever the user references a
  project that already has a folder under projects/ — by name, by topic, or by saying
  "let's continue". Restores full project context from memory files before any work.
---

# Resume a Project

Never continue a project from conversation memory alone. Even if this session already
discussed the project, the files are the source of truth.

## Step 1 — Locate the project

Find the matching folder in `projects/`. If the reference is ambiguous (multiple
plausible folders), ask which one — listing the candidates by their plain-language
goals, not their slugs.

## Step 2 — Restore context, in this order

1. `STATE.md` — where the project is, what's next, what's blocked
2. `PROJECT.md` — goal, nature, in-scope dimensions, project toolbox, open questions
3. `DECISIONS.md` — skim; load enough to not re-litigate settled decisions or
   re-propose rejected options and rejected tools

## Step 3 — Report state before working

Tell the user in 2–4 sentences: where the project stands, what was last done, and what
you propose doing now. This catches stale state and misunderstandings cheaply. If the
user's request matches the "Next" items, proceed directly; if it's something new for
this project, switch to the `evolve` skill instead.

## Step 4 — Work, then write back

Do the work within the project's established scope and decisions. If you find yourself
wanting to contradict a logged decision, surface it to the user explicitly ("we decided
X because Y — I now think Z because W") rather than silently diverging.

Before ending: update `STATE.md` (always) and append to `DECISIONS.md` (if anything
significant was decided). The test: could a fresh session continue tomorrow without
asking the user to repeat anything?
