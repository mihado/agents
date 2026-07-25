# Idea and Think Branch

Idea is direct conductor work, not a separate worker or command. For unclear requests, resolve intent before writing a Brief:

- inspect repository or documentation facts before asking;
- ask only for intent, priorities, constraints, or tradeoffs;
- use `interview-me` discipline: hypothesis first, one question at a time, each question carries a guess, then restate and confirm;
- use `wayfinder` only for large or explicitly requested discovery.

For `/think`:

1. Read task context. If empty, ask what to think through.
2. Apply fact-versus-decision discipline.
3. When writing the first durable artifact for a user-selected work, choose a readable lowercase kebab-case `work_id`, create `.agent-contexts/work/<work-id>/`, and write `.agent-contexts/active.md` before the Brief. On collision, append the smallest available numeric suffix. Never overwrite another work.
4. Write `.agent-contexts/work/<work-id>/brief.md` only when intent, constraints, and acceptance are settled. Include `wf-artifact/v1` frontmatter with `work_id: <work-id>`, `artifact_role: brief`, `artifact_id: brief-01`, observed target, and creation time.
5. Do not dispatch a thinker worker for POC; deepen the direct interview when risk or ambiguity is high.

Return:

```md
## Think Complete
- Brief written to `.agent-contexts/work/<work-id>/brief.md`
- Next: run `/plan`
```
