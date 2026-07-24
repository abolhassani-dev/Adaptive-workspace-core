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

*(empty — first entry arrives with the first real capability gap)*
