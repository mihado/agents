# Recovery Branch

Use for re-orientation, not new planning.

1. Inspect branch, `git status`, recent commits, and current diff.
2. Read available `.agent-contexts/brief.md`, `plan.md`, `research/synthesis.md`, `verify.md`, and `review.md`.
3. When research synthesis exists, compare its decision question with the active Brief. Mark it stale if they differ.
4. Separate durable facts from inference.
5. Do not write a workflow artifact by default.

Return:

```md
## Goal
<what we were trying to do>

## In Progress
- <active work>

## Evidence State
- <latest verify/review/artifact state>

## Drift / Blockers
- <scope drift, blockers, or stale artifacts>

## Next Move
- <single best next step>
```

If evidence is missing, say it is missing. Do not present absent verification as a failed check.
