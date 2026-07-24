# Idea and Think Branch

Idea is direct conductor work, not a separate worker or command. For unclear requests, resolve intent before writing a Brief:

- inspect repository or documentation facts before asking;
- ask only for intent, priorities, constraints, or tradeoffs;
- use `interview-me` discipline: hypothesis first, one question at a time, each question carries a guess, then restate and confirm;
- use `wayfinder` only for large or explicitly requested discovery.

For `/think`:

1. Read task context. If empty, ask what to think through.
2. Apply fact-versus-decision discipline.
3. Write `.agent-contexts/brief.md` only when intent, constraints, and acceptance are settled.
4. Do not dispatch a thinker worker for POC; deepen the direct interview when risk or ambiguity is high.

Return:

```md
## Think Complete
- Brief written to `.agent-contexts/brief.md`
- Next: run `/plan`
```
